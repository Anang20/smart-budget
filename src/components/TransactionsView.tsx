/**
 * TransactionsView.tsx
 * Add/edit/delete transactions with filters. shadcn/ui + Tailwind.
 */
import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAppContext } from '../App';
import type { Transaction } from '../types';
import { formatRupiah, formatDate, todayISO, yearMonth, currentYearMonth, labelYearMonth } from '../lib/formatting';
import { validatePositiveNumber } from '../lib/validation';
import { categoryAmount, sumByCategoryId } from '../lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CurrencyInput } from './ui/currency-input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from './ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Transaction form ─────────────────────────────────────────────────────────

interface TransactionFormProps {
  initial?: Transaction;
  onSubmit: (t: Transaction) => void;
  onCancel: () => void;
}

function TransactionForm({ initial, onSubmit, onCancel }: TransactionFormProps) {
  const { state } = useAppContext();
  const { budget } = state;

  const [type, setType] = useState<Transaction['type']>(initial?.type ?? 'expense');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (budget.categories[0]?.id ?? ''));
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!date) e['date'] = 'Tanggal tidak boleh kosong.';
    const amtResult = validatePositiveNumber(amount, 'Jumlah');
    if (!amtResult.isValid) e['amount'] = amtResult.error;
    else if (Number(amount) === 0) e['amount'] = 'Jumlah harus lebih dari 0.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      id: initial?.id ?? nanoid(),
      date,
      type,
      amount: Number(amount),
      categoryId: type === 'income' ? 'income' : categoryId,
      note: note.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tx-type">Jenis</Label>
          <Select value={type} onValueChange={(v) => setType(v as Transaction['type'])}>
            <SelectTrigger id="tx-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Pengeluaran</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Tanggal</Label>
          <Input
            id="tx-date"
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: '' })); }}
            className={errors['date'] ? 'border-destructive' : ''}
          />
          {errors['date'] && <p className="text-xs text-destructive">{errors['date']}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">Jumlah (Rp)</Label>
          <CurrencyInput
            id="tx-amount"
            value={amount}
            onValueChange={(raw) => { setAmount(raw); setErrors((p) => ({ ...p, amount: '' })); }}
            placeholder="Contoh: 500.000"
            className={errors['amount'] ? 'border-destructive' : ''}
          />
          {errors['amount'] && <p className="text-xs text-destructive">{errors['amount']}</p>}
        </div>

        {type === 'expense' && (
          <div className="space-y-1.5">
            <Label htmlFor="tx-cat">Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="tx-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {budget.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tx-note">Catatan (opsional)</Label>
        <Input
          id="tx-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Contoh: Makan siang, bayar tagihan..."
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit">{initial ? 'Simpan Perubahan' : 'Tambah Transaksi'}</Button>
      </div>
    </form>
  );
}

// ─── Remaining budget table ───────────────────────────────────────────────────

interface RemainingTableProps {
  monthTransactions: Transaction[];
}

function RemainingTable({ monthTransactions }: RemainingTableProps) {
  const { state } = useAppContext();
  const { budget } = state;
  if (budget.monthlyIncome === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sisa Anggaran Bulan Ini per Kategori</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead className="hidden sm:table-cell">Dialokasikan</TableHead>
              <TableHead>Terpakai</TableHead>
              <TableHead>Sisa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budget.categories.map((cat) => {
              const allocated = categoryAmount(budget.monthlyIncome, cat.percentage);
              const spent = sumByCategoryId(monthTransactions, cat.id);
              const remaining = allocated - spent;
              return (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{formatRupiah(allocated)}</TableCell>
                  <TableCell className="tabular-nums">{formatRupiah(spent)}</TableCell>
                  <TableCell className={`tabular-nums font-semibold ${remaining < 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatRupiah(remaining)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── TransactionsView ─────────────────────────────────────────────────────────

export default function TransactionsView() {
  const { state, dispatch } = useAppContext();
  const { transactions, budget } = state;

  const [filterMonth, setFilterMonth] = useState(currentYearMonth());
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentYearMonth());
    transactions.forEach((t) => months.add(yearMonth(t.date)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (yearMonth(t.date) !== filterMonth) return false;
        if (query && !t.note.toLowerCase().includes(query)) return false;
        if (filterCategory !== 'all') {
          if (filterCategory === 'income') return t.type === 'income';
          return t.type === 'expense' && t.categoryId === filterCategory;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterMonth, filterCategory, search]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => yearMonth(t.date) === filterMonth),
    [transactions, filterMonth]
  );

  function categoryName(tx: Transaction): string {
    if (tx.type === 'income') return 'Pemasukan';
    return budget.categories.find((c) => c.id === tx.categoryId)?.name ?? '—';
  }

  function handleAdd(t: Transaction) {
    dispatch({ type: 'ADD_TRANSACTION', payload: t });
    setShowAddForm(false);
  }

  function handleEdit(t: Transaction) {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: t });
    setEditingTx(null);
  }

  function handleDelete(id: string) {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    setDeletingId(null);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transaksi</h1>
        <p className="text-muted-foreground text-sm mt-1">Catat pemasukan dan pengeluaran kamu.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Daftar Transaksi</CardTitle>
            <Button size="sm" onClick={() => { setShowAddForm(true); setEditingTx(null); }} className="gap-1.5">
              <Plus className="w-4 h-4" /> Tambah
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-month">Bulan</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger id="filter-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((ym) => (
                    <SelectItem key={ym} value={ym}>{labelYearMonth(ym)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-cat">Kategori</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger id="filter-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  {budget.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="filter-search">Cari catatan</Label>
              <Input
                id="filter-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik kata kunci..."
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <Alert variant="info">
              <AlertDescription>
                Tidak ada transaksi yang cocok dengan periode, kategori, atau pencarian yang dipilih.
              </AlertDescription>
            </Alert>
          ) : (
            <>
            {/* Phones: one compact card per transaction */}
            <ul className="space-y-2 md:hidden" aria-label="Daftar transaksi">
              {filtered.map((tx) => (
                <li key={tx.id} className="flex items-center gap-2 rounded-2xl bg-muted p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{categoryName(tx)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatDate(tx.date)}{tx.note ? ` · ${tx.note}` : ''}
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold tabular-nums ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => { setEditingTx(tx); setShowAddForm(false); }}
                    aria-label={`Edit transaksi ${formatDate(tx.date)}`}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeletingId(tx.id)}
                    aria-label={`Hapus transaksi ${formatDate(tx.date)}`}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            {/* Tablets and desktops: full table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'income' ? 'income' : 'expense'}>
                        {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{categoryName(tx)}</TableCell>
                    <TableCell className={`tabular-nums font-semibold text-sm ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {tx.note || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => { setEditingTx(tx); setShowAddForm(false); }}
                          aria-label={`Edit transaksi ${formatDate(tx.date)}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingId(tx.id)}
                          aria-label={`Hapus transaksi ${formatDate(tx.date)}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <RemainingTable monthTransactions={monthTransactions} />

      {/* Add dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Transaksi Baru</DialogTitle>
          </DialogHeader>
          <TransactionForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingTx} onOpenChange={(open) => { if (!open) setEditingTx(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
          </DialogHeader>
          {editingTx && (
            <TransactionForm
              initial={editingTx}
              onSubmit={handleEdit}
              onCancel={() => setEditingTx(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Transaksi?</DialogTitle>
            <DialogDescription>
              Transaksi ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
