/**
 * SheetsPanel.tsx
 * Export/import to Excel (.xlsx) and Google Sheets. Rendered inside the Settings view.
 * Importing never overwrites data silently: the user confirms a summary first.
 */
import React, { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Link2, Upload, Download, Unplug } from 'lucide-react';
import { useAppContext } from '../App';
import type { AppData } from '../types';
import { downloadExcel, downloadExcelTemplate, readExcelTables } from '../lib/excel';
import { SHEET, appDataToTables, tablesToAppData } from '../lib/spreadsheet';
import {
  GoogleSheetsError,
  createSpreadsheet,
  isGoogleConfigured,
  isTokenFresh,
  loadGoogleIdentity,
  overwriteSpreadsheet,
  parseSpreadsheetId,
  readSpreadsheet,
  requestGoogleToken,
  revokeGoogleToken,
  spreadsheetUrl,
  type GoogleToken,
} from '../lib/googleSheets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from './ui/dialog';

/**
 * Google Sheets is switched off for now: only JSON and Excel are offered in the UI.
 * The integration code is kept intact, so turning this on again is just flipping the flag.
 */
const SHOW_GOOGLE_SHEETS = false;

type Busy = 'excel-export' | 'excel-template' | 'excel-import' | 'connect' | 'sheets-export' | 'sheets-import' | null;

interface Notice {
  kind: 'success' | 'error';
  text: string;
  href?: string;
}

interface PendingImport {
  data: AppData;
  source: string;
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof GoogleSheetsError ? err.message : fallback;
}

export default function SheetsPanel() {
  const { state, dispatch } = useAppContext();
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [token, setToken] = useState<GoogleToken | null>(null);
  const [sheetInput, setSheetInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the Google sign-in script ahead of time so the popup opens right when the button is pressed.
  useEffect(() => {
    if (SHOW_GOOGLE_SHEETS && isGoogleConfigured) loadGoogleIdentity().catch(() => undefined);
  }, []);

  const connected = isTokenFresh(token);

  async function run(kind: Exclude<Busy, null>, task: () => Promise<void>, fallbackError: string) {
    setBusy(kind);
    setNotice(null);
    try {
      await task();
    } catch (err) {
      setNotice({ kind: 'error', text: errorText(err, fallbackError) });
    } finally {
      setBusy(null);
    }
  }

  async function ensureToken(): Promise<string> {
    if (isTokenFresh(token)) return token.accessToken;
    const fresh = await requestGoogleToken();
    setToken(fresh);
    return fresh.accessToken;
  }

  // ─── Excel ──────────────────────────────────────────────────────────────────

  function exportExcel() {
    void run(
      'excel-export',
      async () => {
        await downloadExcel(state);
        setNotice({ kind: 'success', text: 'File Excel berhasil dibuat. Cek folder Unduhan.' });
      },
      'Gagal membuat file Excel.'
    );
  }

  function downloadTemplate() {
    void run(
      'excel-template',
      async () => {
        await downloadExcelTemplate();
        setNotice({
          kind: 'success',
          text: 'Template berhasil diunduh. Isi datanya, lalu pilih "Impor dari Excel". Petunjuk ada di tab pertama.',
        });
      },
      'Gagal membuat template Excel.'
    );
  }

  function handleExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setNotice({ kind: 'error', text: 'Hanya file berformat .xlsx yang dapat diimpor.' });
      return;
    }
    void run(
      'excel-import',
      async () => {
        const { data, error } = tablesToAppData(await readExcelTables(file));
        if (!data) {
          setNotice({ kind: 'error', text: error });
          return;
        }
        setPending({ data, source: file.name });
      },
      'File Excel tidak valid atau rusak.'
    );
  }

  // ─── Google Sheets ──────────────────────────────────────────────────────────

  function connectGoogle() {
    void run('connect', async () => {
      await ensureToken();
      setNotice({ kind: 'success', text: 'Akun Google terhubung.' });
    }, 'Gagal menghubungkan akun Google.');
  }

  function disconnectGoogle() {
    if (token) revokeGoogleToken(token);
    setToken(null);
    setNotice({ kind: 'success', text: 'Koneksi Google diputus.' });
  }

  function exportToSheets() {
    const trimmed = sheetInput.trim();
    const id = parseSpreadsheetId(trimmed);
    if (trimmed !== '' && !id) {
      setNotice({ kind: 'error', text: 'Tautan atau ID spreadsheet tidak valid.' });
      return;
    }
    void run(
      'sheets-export',
      async () => {
        const accessToken = await ensureToken();
        const tables = appDataToTables(state);
        if (id) {
          await overwriteSpreadsheet(accessToken, id, tables);
          setNotice({ kind: 'success', text: 'Data berhasil dikirim ke spreadsheet.', href: spreadsheetUrl(id) });
        } else {
          const title = `Smart Budget ${new Date().toISOString().slice(0, 10)}`;
          const newId = await createSpreadsheet(accessToken, title, tables);
          setSheetInput(spreadsheetUrl(newId)); // the next export updates this same spreadsheet
          setNotice({ kind: 'success', text: 'Spreadsheet baru dibuat di Google Drive-mu.', href: spreadsheetUrl(newId) });
        }
      },
      'Gagal mengirim data ke Google Sheets.'
    );
  }

  function importFromSheets() {
    const id = parseSpreadsheetId(sheetInput);
    if (!id) {
      setNotice({ kind: 'error', text: 'Isi tautan atau ID spreadsheet yang valid untuk mengimpor.' });
      return;
    }
    void run(
      'sheets-import',
      async () => {
        const accessToken = await ensureToken();
        const tables = await readSpreadsheet(accessToken, id, Object.values(SHEET));
        const { data, error } = tablesToAppData(tables);
        if (!data) {
          setNotice({ kind: 'error', text: error });
          return;
        }
        setPending({ data, source: 'Google Sheets' });
      },
      'Gagal membaca data dari Google Sheets.'
    );
  }

  // ─── Confirm import ─────────────────────────────────────────────────────────

  function confirmImport() {
    if (!pending) return;
    dispatch({ type: 'IMPORT_DATA', payload: pending.data });
    setNotice({ kind: 'success', text: `Data berhasil diimpor dari ${pending.source}.` });
    setPending(null);
  }

  const isBusy = busy !== null;

  return (
    <>
      {notice && (
        <Alert variant={notice.kind === 'error' ? 'destructive' : 'success'}>
          <AlertDescription>
            {notice.kind === 'error' ? '✗ ' : '✓ '}
            {notice.text}
            {notice.href && (
              <>
                {' '}
                <a
                  href={notice.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  Buka spreadsheet
                </a>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Excel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand" aria-hidden="true" />
            <CardTitle className="text-base">Excel (.xlsx)</CardTitle>
          </div>
          <CardDescription>
            Ekspor ke file Excel untuk dibuka di Excel, Google Sheets, atau aplikasi lain. File yang sama bisa diedit
            lalu diimpor kembali. Belum punya data? Unduh template berisi contoh dan petunjuk pengisian.{' '}
            <strong>Impor akan mengganti seluruh data saat ini.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleExcelFile}
            className="hidden"
            aria-label="Pilih file Excel untuk diimpor"
          />
          <Button variant="outline" className="gap-2" disabled={isBusy} onClick={exportExcel}>
            <Download className="h-4 w-4" /> Ekspor ke Excel
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={isBusy}
            onClick={() => {
              setNotice(null);
              fileInputRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" /> Impor dari Excel
          </Button>
          <Button variant="ghost" className="gap-2" disabled={isBusy} onClick={downloadTemplate}>
            <FileSpreadsheet className="h-4 w-4" /> Unduh Template
          </Button>
        </CardContent>
      </Card>

      {/* Google Sheets (hidden, see SHOW_GOOGLE_SHEETS) */}
      {SHOW_GOOGLE_SHEETS && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-brand" aria-hidden="true" />
              <CardTitle className="text-base">Google Sheets</CardTitle>
            </div>
            <CardDescription>
              Kirim data ke spreadsheet Google-mu atau ambil kembali dari sana. Data tetap tersimpan di perangkat ini;
              Google hanya dihubungi saat kamu menekan tombol di bawah.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isGoogleConfigured ? (
              <Alert variant="info">
                <AlertDescription>
                  Google Sheets belum diaktifkan. Isi <code>VITE_GOOGLE_CLIENT_ID</code> di file <code>.env</code>{' '}
                  (langkah lengkap ada di README), lalu jalankan ulang aplikasi. Sementara itu, ekspor ke Excel lalu buka
                  di Google Sheets lewat <strong>File → Buka → Upload</strong>.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted p-3 text-sm">
                  <span>
                    Status:{' '}
                    <strong className={connected ? 'text-success' : 'text-muted-foreground'}>
                      {connected ? 'Terhubung' : 'Belum terhubung'}
                    </strong>
                  </span>
                  {connected ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={disconnectGoogle} disabled={isBusy}>
                      <Unplug className="h-4 w-4" /> Putuskan
                    </Button>
                  ) : (
                    <Button size="sm" onClick={connectGoogle} disabled={isBusy}>
                      Hubungkan Google
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sheet-url">Tautan atau ID spreadsheet</Label>
                  <Input
                    id="sheet-url"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    inputMode="url"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kosongkan saat ekspor untuk membuat spreadsheet baru. Jika diisi, tab {Object.values(SHEET).join(', ')}{' '}
                    di spreadsheet itu akan ditimpa; tab lain tidak disentuh.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="gap-2" disabled={isBusy} onClick={exportToSheets}>
                    <Download className="h-4 w-4" /> Ekspor ke Google Sheets
                  </Button>
                  <Button variant="outline" className="gap-2" disabled={isBusy} onClick={importFromSheets}>
                    <Upload className="h-4 w-4" /> Impor dari Google Sheets
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm replacing data */}
      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ganti data dengan isi file?</DialogTitle>
            <DialogDescription>
              {pending
                ? `${pending.source} berisi ${pending.data.budget.categories.length} kategori, ${pending.data.transactions.length} transaksi, dan ${pending.data.goals.length} target. `
                : ''}
              Seluruh data di aplikasi saat ini akan diganti dan tidak dapat dikembalikan. Ekspor dulu jika perlu backup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Batal</Button>
            <Button onClick={confirmImport}>Ya, Ganti Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
