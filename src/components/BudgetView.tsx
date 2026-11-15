/**
 * BudgetView.tsx
 * Monthly income input, editable 50/30/20 categories table, add custom categories.
 * Styled with shadcn/ui + Tailwind.
 */
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useAppContext } from '../App';
import type { BudgetCategory } from '../types';
import { categoryAmount, totalPercentage, sumByCategoryId } from '../lib/calculations';
import { formatRupiah } from '../lib/formatting';
import { validatePositiveNumber, validatePercentage } from '../lib/validation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CurrencyInput } from './ui/currency-input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Income Input ─────────────────────────────────────────────────────────────

function IncomeInput() {
  const { state, dispatch } = useAppContext();
  const [value, setValue] = useState(
    state.budget.monthlyIncome > 0 ? String(state.budget.monthlyIncome) : ''
  );
  const [error, setError] = useState('');

  function handleBlur() {
    const result = validatePositiveNumber(value, 'Pendapatan bulanan');
    if (!result.isValid) { setError(result.error); return; }
    setError('');
    dispatch({ type: 'SET_MONTHLY_INCOME', payload: Number(value) });
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pendapatan Bulanan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor="income-input">Jumlah pendapatan (Rp)</Label>
          <CurrencyInput
            id="income-input"
            value={value}
            onValueChange={(raw) => { setValue(raw); setError(''); }}
            onBlur={handleBlur}
            placeholder="Contoh: 10.000.000"
            className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {state.budget.monthlyIncome > 0 && !error && (
            <p className="text-xs text-muted-foreground">{formatRupiah(state.budget.monthlyIncome)}/bulan</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Category row ─────────────────────────────────────────────────────────────

interface CategoryRowProps {
  category: BudgetCategory;
  income: number;
  spent: number;
  isDefault: boolean;
  onUpdate: (updated: BudgetCategory) => void;
  onDelete: (id: string) => void;
}

function CategoryRow({ category, income, spent, isDefault, onUpdate, onDelete }: CategoryRowProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(category.name);
  const [nameError, setNameError] = useState('');

  const [editingPct, setEditingPct] = useState(false);
  const [pctValue, setPctValue] = useState(String(category.percentage));
  const [pctError, setPctError] = useState('');

  const allocated = categoryAmount(income, category.percentage);
  const remaining = allocated - spent;
  const pctUsed = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const isOver = remaining < 0;

  function saveName() {
    if (nameValue.trim() === '') { setNameError('Nama tidak boleh kosong.'); return; }
    setNameError('');
    onUpdate({ ...category, name: nameValue.trim() });
    setEditingName(false);
  }

  function savePct() {
    const result = validatePercentage(pctValue, 'Persentase');
    if (!result.isValid) { setPctError(result.error); return; }
    setPctError('');
    onUpdate({ ...category, percentage: Number(pctValue) });
    setEditingPct(false);
  }

  const barColor = isOver ? 'bg-destructive' : pctUsed > 80 ? 'bg-warning' : 'bg-brand';

  return (
    <TableRow>
      {/* Name */}
      <TableCell className="font-medium">
        {editingName ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              value={nameValue}
              onChange={(e) => { setNameValue(e.target.value); setNameError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
              className="h-9 w-32 text-sm md:h-8 md:w-40 md:text-xs"
              aria-label="Nama kategori"
            />
            <Button size="icon-sm" variant="default" onClick={saveName} aria-label="Simpan nama"><Check className="w-3 h-3" /></Button>
            <Button size="icon-sm" variant="outline" onClick={() => setEditingName(false)} aria-label="Batal"><X className="w-3 h-3" /></Button>
          </div>
        ) : (
          <button
            className="text-left hover:underline underline-offset-2 decoration-dashed text-sm"
            onClick={() => setEditingName(true)}
            title="Klik untuk mengubah nama"
          >
            {category.name}
          </button>
        )}
        {nameError && <p className="text-xs text-destructive mt-0.5">{nameError}</p>}
      </TableCell>

      {/* Percentage */}
      <TableCell>
        {editingPct ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={pctValue}
              onChange={(e) => { setPctValue(e.target.value); setPctError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') savePct(); if (e.key === 'Escape') setEditingPct(false); }}
              autoFocus
              className="h-9 w-16 text-sm md:h-8 md:text-xs"
              aria-label="Persentase kategori"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <Button size="icon-sm" variant="default" onClick={savePct} aria-label="Simpan persen"><Check className="w-3 h-3" /></Button>
            <Button size="icon-sm" variant="outline" onClick={() => setEditingPct(false)} aria-label="Batal"><X className="w-3 h-3" /></Button>
          </div>
        ) : (
          <button
            className="inline-flex items-center gap-1 text-sm hover:underline underline-offset-2 decoration-dashed"
            onClick={() => setEditingPct(true)}
            title="Klik untuk mengubah persentase"
          >
            {category.percentage}%
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
        {pctError && <p className="text-xs text-destructive mt-0.5">{pctError}</p>}
      </TableCell>

      {/* Allocated */}
      <TableCell className="hidden tabular-nums sm:table-cell">
        {income > 0 ? formatRupiah(allocated) : '—'}
      </TableCell>

      {/* Spent */}
      <TableCell className="hidden tabular-nums md:table-cell">
        {income > 0 ? formatRupiah(spent) : '—'}
      </TableCell>

      {/* Remaining */}
      <TableCell className={`tabular-nums font-semibold ${isOver ? 'text-destructive' : 'text-success'}`}>
        {income > 0 ? formatRupiah(remaining) : '—'}
      </TableCell>

      {/* Usage bar */}
      <TableCell className="hidden w-28 md:table-cell">
        {income > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pctUsed}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-xs text-muted-foreground">{pctUsed.toFixed(0)}%</span>
          </div>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell>
        {!isDefault && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(category.id)}
            aria-label={`Hapus kategori ${category.name}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Add category form ────────────────────────────────────────────────────────

interface AddCategoryFormProps {
  onAdd: (cat: BudgetCategory) => void;
}

function AddCategoryForm({ onAdd }: AddCategoryFormProps) {
  const [name, setName] = useState('');
  const [pct, setPct] = useState('');
  const [nameError, setNameError] = useState('');
  const [pctError, setPctError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;
    if (name.trim() === '') { setNameError('Nama kategori tidak boleh kosong.'); valid = false; }
    const pctResult = validatePercentage(pct, 'Persentase');
    if (!pctResult.isValid) { setPctError(pctResult.error); valid = false; }
    if (!valid) return;

    onAdd({ id: nanoid(), name: name.trim(), percentage: Number(pct), group: 'custom' });
    setName('');
    setPct('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="new-cat-name">Nama kategori baru</Label>
        <Input
          id="new-cat-name"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(''); }}
          placeholder="Contoh: Dana Darurat"
          className={`sm:w-52 ${nameError ? 'border-destructive' : ''}`}
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-cat-pct">Persentase (%)</Label>
        <Input
          id="new-cat-pct"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={pct}
          onChange={(e) => { setPct(e.target.value); setPctError(''); }}
          placeholder="0"
          className={`sm:w-24 ${pctError ? 'border-destructive' : ''}`}
        />
        {pctError && <p className="text-xs text-destructive">{pctError}</p>}
      </div>
      <Button type="submit" className="gap-1.5">
        <Plus className="w-4 h-4" /> Tambah Kategori
      </Button>
    </form>
  );
}

// ─── BudgetView ───────────────────────────────────────────────────────────────

export default function BudgetView() {
  const { state, dispatch } = useAppContext();
  const { budget, transactions } = state;
  const { monthlyIncome, categories } = budget;

  const total = totalPercentage(categories);
  const totalOk = Math.abs(total - 100) < 0.01;

  function spentForCategory(id: string): number {
    return sumByCategoryId(transactions, id);
  }

  const DEFAULT_IDS = new Set(['needs', 'wants', 'savings']);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Anggaran</h1>
        <p className="text-muted-foreground text-sm mt-1">Atur alokasi pendapatan bulanan kamu.</p>
      </div>

      <IncomeInput />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Alokasi Kategori</CardTitle>
            <Badge variant={totalOk ? 'success' : 'destructive'}>
              Total: {total.toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>

        {!totalOk && (
          <div className="px-5 pb-3">
            <Alert variant="warning">
              <AlertDescription>
                Jumlah persentase semua kategori harus tepat 100%. Saat ini: <strong>{total.toFixed(1)}%</strong>.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead>Alokasi</TableHead>
                <TableHead className="hidden sm:table-cell">Dialokasikan</TableHead>
                <TableHead className="hidden md:table-cell">Terpakai</TableHead>
                <TableHead>Sisa</TableHead>
                <TableHead className="hidden md:table-cell">Penggunaan</TableHead>
                <TableHead><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  income={monthlyIncome}
                  spent={spentForCategory(cat.id)}
                  isDefault={DEFAULT_IDS.has(cat.id)}
                  onUpdate={(u) => dispatch({ type: 'UPDATE_CATEGORY', payload: u })}
                  onDelete={(id) => dispatch({ type: 'DELETE_CATEGORY', payload: id })}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>

        <div className="border-t p-5">
          <h3 className="text-sm font-semibold mb-4">Tambah Kategori Kustom</h3>
          <AddCategoryForm onAdd={(cat) => dispatch({ type: 'ADD_CATEGORY', payload: cat })} />
        </div>
      </Card>
    </div>
  );
}
