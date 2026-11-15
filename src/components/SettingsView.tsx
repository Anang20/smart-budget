/**
 * SettingsView.tsx
 * Export, import, and reset data. shadcn/ui + Tailwind.
 */
import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, Database } from 'lucide-react';
import { useAppContext } from '../App';
import type { AppData } from '../types';
import { validateImportData } from '../lib/validation';
import { CURRENT_VERSION } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import SheetsPanel from './SheetsPanel';
import InstallCard from './InstallCard';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from './ui/dialog';

export default function SettingsView() {
  const { state, dispatch } = useAppContext();

  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Export ────────────────────────────────────────────────────────────────

  function handleExport() {
    const payload: AppData = { ...state, version: CURRENT_VERSION };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-budget-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Import ────────────────────────────────────────────────────────────────

  function handleImportClick() {
    setImportError('');
    setImportSuccess('');
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.name.endsWith('.json')) {
      setImportError('Hanya file berformat .json yang dapat diimpor.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw: unknown = JSON.parse(evt.target?.result as string);
        const { data, error } = validateImportData(raw);
        if (!data) { setImportError(error); return; }
        dispatch({ type: 'IMPORT_DATA', payload: data });
        setImportSuccess('Data berhasil diimpor!');
        setImportError('');
      } catch {
        setImportError('File JSON tidak valid atau rusak.');
      }
    };
    reader.readAsText(file);
  }

  // ─── Reset ─────────────────────────────────────────────────────────────────

  function handleReset() {
    dispatch({ type: 'RESET_DATA' });
    setShowResetConfirm(false);
  }

  const txCount = state.transactions.length;
  const catCount = state.budget.categories.length;
  const goalCount = state.goals.length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data &amp; Setelan</h1>
        <p className="text-muted-foreground text-sm mt-1">Kelola, backup, dan reset data aplikasi.</p>
      </div>

      {/* Data summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Ringkasan Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-tint-mint p-3 text-center sm:p-4">
              <div className="text-2xl font-semibold sm:text-3xl">{catCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Kategori</div>
            </div>
            <div className="rounded-2xl bg-tint-blue p-3 text-center sm:p-4">
              <div className="text-2xl font-semibold sm:text-3xl">{txCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Transaksi</div>
            </div>
            <div className="rounded-2xl bg-tint-yellow p-3 text-center sm:p-4">
              <div className="text-2xl font-semibold sm:text-3xl">{goalCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Target</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Ekspor Data</CardTitle>
          </div>
          <CardDescription>
            Simpan semua data ke file JSON untuk backup atau pemindahan ke perangkat lain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Ekspor ke JSON
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Import */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Impor Data</CardTitle>
          </div>
          <CardDescription>
            Muat ulang data dari file JSON yang sebelumnya diekspor.{' '}
            <strong>Data yang ada saat ini akan diganti sepenuhnya.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {importError && (
            <Alert variant="destructive">
              <AlertDescription>✗ {importError}</AlertDescription>
            </Alert>
          )}
          {importSuccess && (
            <Alert variant="success">
              <AlertDescription>✓ {importSuccess}</AlertDescription>
            </Alert>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Pilih file JSON untuk diimpor"
          />
          <Button onClick={handleImportClick} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" /> Impor dari JSON
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Excel & Google Sheets */}
      <SheetsPanel />

      <Separator />

      {/* Install as app */}
      <InstallCard />

      <Separator />

      {/* Reset */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            <CardTitle className="text-base text-destructive">Reset Semua Data</CardTitle>
          </div>
          <CardDescription>
            Hapus semua data anggaran, kategori, transaksi, dan target keuangan. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setShowResetConfirm(true)} className="gap-2">
            <Trash2 className="w-4 h-4" /> Reset Semua Data
          </Button>
        </CardContent>
      </Card>

      {/* Reset confirm dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Semua Data?</DialogTitle>
            <DialogDescription>
              Semua data akan dihapus secara permanen, termasuk{' '}
              <strong>{catCount} kategori</strong> dan{' '}
              <strong>{txCount} transaksi</strong>, dan{' '}
              <strong>{goalCount} target</strong>.
              Pastikan Anda sudah mengekspor data terlebih dahulu jika diperlukan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleReset}>Ya, Reset Sekarang</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
