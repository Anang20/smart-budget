/**
 * googleSheets.ts
 * Google Sheets sync without a backend:
 *  - sign-in with Google Identity Services (OAuth token flow, token kept in memory only)
 *  - Sheets REST API v4 over fetch
 *
 * Needs the user's own OAuth client ID in VITE_GOOGLE_CLIENT_ID (see README). Nothing secret is stored in the app:
 * a client ID is public by design, and the access token never touches localStorage.
 */

import type { CellValue, SheetTable } from './spreadsheet';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
export const isGoogleConfigured: boolean = GOOGLE_CLIENT_ID !== '';

// ─── Google Identity Services (minimal typings) ───────────────────────────────

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface GoogleAccounts {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: TokenResponse) => void;
      error_callback?: (error: { type: string }) => void;
    }) => TokenClient;
    revoke: (token: string, done?: () => void) => void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

export class GoogleSheetsError extends Error {}

let gisPromise: Promise<GoogleAccounts> | null = null;

/** Load the Google sign-in script once. Call early (e.g. on mount) so the sign-in popup opens instantly on click. */
export function loadGoogleIdentity(): Promise<GoogleAccounts> {
  if (window.google?.accounts) return Promise.resolve(window.google.accounts);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<GoogleAccounts>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => {
      if (window.google?.accounts) resolve(window.google.accounts);
      else reject(new GoogleSheetsError('Layanan Google gagal dimuat.'));
    };
    script.onerror = () => {
      gisPromise = null; // allow a retry after the connection comes back
      reject(new GoogleSheetsError('Tidak bisa memuat layanan Google. Periksa koneksi internet.'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

export interface GoogleToken {
  accessToken: string;
  /** Epoch milliseconds */
  expiresAt: number;
}

/** Open the Google consent popup. Must be called from a click handler. */
export async function requestGoogleToken(): Promise<GoogleToken> {
  if (!isGoogleConfigured) throw new GoogleSheetsError('Google Client ID belum diatur.');
  const accounts = await loadGoogleIdentity();
  return new Promise<GoogleToken>((resolve, reject) => {
    const client = accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new GoogleSheetsError('Izin Google tidak diberikan.'));
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
        });
      },
      error_callback: () => reject(new GoogleSheetsError('Jendela masuk Google ditutup atau diblokir browser.')),
    });
    client.requestAccessToken();
  });
}

export function revokeGoogleToken(token: GoogleToken): void {
  window.google?.accounts.oauth2.revoke(token.accessToken);
}

export function isTokenFresh(token: GoogleToken | null): token is GoogleToken {
  return token !== null && token.expiresAt - Date.now() > 60_000;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Accepts a full spreadsheet URL or a bare spreadsheet ID. */
export function parseSpreadsheetId(input: string): string | null {
  const text = input.trim();
  if (text === '') return null;
  const fromUrl = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(text);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(text) ? text : null;
}

export const spreadsheetUrl = (id: string): string => `https://docs.google.com/spreadsheets/d/${id}`;

async function callApi<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new GoogleSheetsError('Tidak bisa terhubung ke Google. Periksa koneksi internet.');
  }

  if (response.ok) return (await response.json()) as T;

  switch (response.status) {
    case 401:
      throw new GoogleSheetsError('Sesi Google berakhir. Hubungkan ulang lalu coba lagi.');
    case 403:
      throw new GoogleSheetsError(
        'Akses ditolak. Pastikan akunmu boleh mengedit spreadsheet ini dan Google Sheets API sudah diaktifkan di proyek Google Cloud-mu.'
      );
    case 404:
      throw new GoogleSheetsError('Spreadsheet tidak ditemukan. Periksa tautan atau ID-nya.');
    case 429:
      throw new GoogleSheetsError('Terlalu banyak permintaan ke Google. Tunggu sebentar lalu coba lagi.');
    default:
      throw new GoogleSheetsError(`Google Sheets menolak permintaan (kode ${response.status}).`);
  }
}

const quote = (sheetName: string): string => `'${sheetName.replace(/'/g, "''")}'`;

async function listTitles(token: string, id: string): Promise<string[]> {
  const meta = await callApi<{ sheets?: { properties: { title: string } }[] }>(
    token,
    `/${id}?fields=sheets.properties.title`
  );
  return (meta.sheets ?? []).map((s) => s.properties.title);
}

async function writeValues(token: string, id: string, tables: SheetTable[]): Promise<void> {
  await callApi(token, `/${id}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW', // keeps "2026-11-15" as text and numbers as numbers
      data: tables.map((t) => ({ range: `${quote(t.name)}!A1`, majorDimension: 'ROWS', values: t.rows })),
    }),
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Create a new spreadsheet in the user's Drive and fill it. Returns its ID. */
export async function createSpreadsheet(token: string, title: string, tables: SheetTable[]): Promise<string> {
  const created = await callApi<{ spreadsheetId: string }>(token, '', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: tables.map((t) => ({ properties: { title: t.name, gridProperties: { frozenRowCount: 1 } } })),
    }),
  });
  await writeValues(token, created.spreadsheetId, tables);
  return created.spreadsheetId;
}

/** Overwrite the app's tabs in an existing spreadsheet (other tabs are left alone). */
export async function overwriteSpreadsheet(token: string, id: string, tables: SheetTable[]): Promise<void> {
  const existing = new Set(await listTitles(token, id));
  const missing = tables.filter((t) => !existing.has(t.name));
  if (missing.length > 0) {
    await callApi(token, `/${id}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: missing.map((t) => ({
          addSheet: { properties: { title: t.name, gridProperties: { frozenRowCount: 1 } } },
        })),
      }),
    });
  }
  await callApi(token, `/${id}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({ ranges: tables.map((t) => quote(t.name)) }),
  });
  await writeValues(token, id, tables);
}

/** Read the app's tabs (those that exist) from a spreadsheet. */
export async function readSpreadsheet(token: string, id: string, names: readonly string[]): Promise<SheetTable[]> {
  const existing = new Set(await listTitles(token, id));
  const wanted = names.filter((n) => existing.has(n));
  if (wanted.length === 0) return [];

  const query = [
    ...wanted.map((n) => `ranges=${encodeURIComponent(quote(n))}`),
    'majorDimension=ROWS',
    'valueRenderOption=UNFORMATTED_VALUE',
    'dateTimeRenderOption=FORMATTED_STRING',
  ].join('&');
  const result = await callApi<{ valueRanges?: { values?: unknown[][] }[] }>(token, `/${id}/values:batchGet?${query}`);

  return wanted.map((name, i) => ({
    name,
    rows: (result.valueRanges?.[i]?.values ?? []).map((row) =>
      row.map((cell): CellValue =>
        typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean' ? cell : null
      )
    ),
  }));
}
