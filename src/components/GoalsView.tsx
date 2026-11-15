/**
 * GoalsView.tsx
 * Financial goals: target amount, saved so far, optional deadline, and the monthly
 * saving needed to hit the deadline. shadcn/ui + Tailwind.
 */
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { useAppContext } from '../App';
import type { Goal } from '../types';
import { goalMonthlyNeeded, goalProgressPercent } from '../lib/calculations';
import { formatDate, formatRupiah, todayISO } from '../lib/formatting';
import { createId } from '../lib/utils';
import { validatePositiveNumber } from '../lib/validation';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CurrencyInput } from './ui/currency-input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from './ui/dialog';

// ─── Forms ────────────────────────────────────────────────────────────────────

interface GoalFormProps {
  initial?: Goal;
  onSubmit: (goal: Goal) => void;
  onCancel: () => void;
}

function GoalForm({ initial, onSubmit, onCancel }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(initial ? String(initial.targetAmount) : '');
  const [savedAmount, setSavedAmount] = useState(initial ? String(initial.savedAmount) : '0');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (name.trim() === '') e['name'] = 'Nama target tidak boleh kosong.';
    else if (name.trim().length > 60) e['name'] = 'Nama target maksimal 60 karakter.';
    const target = validatePositiveNumber(targetAmount, 'Nominal target');
    if (!target.isValid) e['target'] = target.error;
    else if (Number(targetAmount) === 0) e['target'] = 'Nominal target harus lebih dari 0.';
    const saved = validatePositiveNumber(savedAmount, 'Dana terkumpul');
    if (!saved.isValid) e['saved'] = saved.error;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      id: initial?.id ?? createId(),
      name: name.trim(),
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount),
      deadline,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="goal-name">Nama Target</Label>
        <Input
          id="goal-name"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
          placeholder="Contoh: Dana darurat, Laptop baru"
          className={errors['name'] ? 'border-destructive' : ''}
        />
        {errors['name'] && <p className="text-xs text-destructive">{errors['name']}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="goal-target">Nominal Target (Rp)</Label>
          <CurrencyInput
            id="goal-target"
            value={targetAmount}
            onValueChange={(raw) => { setTargetAmount(raw); setErrors((p) => ({ ...p, target: '' })); }}
            className={errors['target'] ? 'border-destructive' : ''}
          />
          {errors['target'] && <p className="text-xs text-destructive">{errors['target']}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-saved">Dana Terkumpul (Rp)</Label>
          <CurrencyInput
            id="goal-saved"
            value={savedAmount}
            onValueChange={(raw) => { setSavedAmount(raw); setErrors((p) => ({ ...p, saved: '' })); }}
            className={errors['saved'] ? 'border-destructive' : ''}
          />
          {errors['saved'] && <p className="text-xs text-destructive">{errors['saved']}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-deadline">Tenggat (opsional)</Label>
        <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit">{initial ? 'Simpan Perubahan' : 'Tambah Target'}</Button>
      </div>
    </form>
  );
}

type DepositMode = 'add' | 'subtract';

interface DepositFormProps {
  goal: Goal;
  mode: DepositMode;
  onSubmit: (amount: number) => void;
  onCancel: () => void;
}

function DepositForm({ goal, mode, onSubmit, onCancel }: DepositFormProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const isSubtract = mode === 'subtract';
  const label = isSubtract ? 'Jumlah pengurangan' : 'Jumlah setoran';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validatePositiveNumber(amount, label);
    if (!result.isValid) return setError(result.error);
    if (Number(amount) === 0) return setError(`${label} harus lebih dari 0.`);
    if (isSubtract && Number(amount) > goal.savedAmount) {
      return setError(`${label} tidak boleh melebihi dana terkumpul (${formatRupiah(goal.savedAmount)}).`);
    }
    onSubmit(Number(amount));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="deposit-amount">{isSubtract ? 'Jumlah Pengurangan (Rp)' : 'Jumlah Setoran (Rp)'}</Label>
        <CurrencyInput
          id="deposit-amount"
          value={amount}
          autoFocus
          onValueChange={(raw) => { setAmount(raw); setError(''); }}
          className={error ? 'border-destructive' : ''}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Terkumpul saat ini {formatRupiah(goal.savedAmount)} dari {formatRupiah(goal.targetAmount)}.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit">{isSubtract ? 'Kurangi Dana' : 'Simpan Setoran'}</Button>
      </div>
    </form>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: Goal;
  onDeposit: (goal: Goal) => void;
  onWithdraw: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

function GoalCard({ goal, onDeposit, onWithdraw, onEdit, onDelete }: GoalCardProps) {
  const today = todayISO();
  const percent = goalProgressPercent(goal);
  const isReached = goal.savedAmount >= goal.targetAmount;
  const isOverdue = !isReached && goal.deadline !== '' && goal.deadline < today;
  const monthlyNeeded = goalMonthlyNeeded(goal, today);

  return (
    <Card className="border-0 bg-tint-mint">
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{goal.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {goal.deadline ? `Tenggat ${formatDate(goal.deadline)}` : 'Tanpa tenggat'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {isReached && <Badge variant="success">Tercapai</Badge>}
            {isOverdue && <Badge variant="expense">Lewat tenggat</Badge>}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(goal)}
              aria-label={`Edit target ${goal.name}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(goal)}
              aria-label={`Hapus target ${goal.name}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{formatRupiah(goal.savedAmount)}</span>
            <span className="text-muted-foreground">{formatRupiah(goal.targetAmount)}</span>
          </div>
          <Progress value={percent} aria-label={`Progres ${goal.name}: ${percent.toFixed(0)}%`} />
          <p className="text-xs text-muted-foreground">{percent.toFixed(0)}% tercapai</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {monthlyNeeded !== null
              ? `Perlu menabung ${formatRupiah(monthlyNeeded)} per bulan`
              : isReached
                ? 'Target sudah terpenuhi'
                : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {goal.savedAmount > 0 && (
              <Button size="sm" variant="ghost" onClick={() => onWithdraw(goal)}>
                Kurangi Dana
              </Button>
            )}
            {!isReached && (
              <Button size="sm" variant="outline" onClick={() => onDeposit(goal)}>
                Tambah Setoran
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── GoalsView ────────────────────────────────────────────────────────────────

type DialogState =
  | { kind: 'add' }
  | { kind: 'edit'; goal: Goal }
  | { kind: 'deposit'; goal: Goal; mode: DepositMode }
  | { kind: 'delete'; goal: Goal }
  | null;

export default function GoalsView() {
  const { state, dispatch } = useAppContext();
  const { goals } = state;
  const [dialog, setDialog] = useState<DialogState>(null);

  const closeDialog = () => setDialog(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Target Keuangan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau dana yang sudah terkumpul untuk setiap tujuanmu.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ kind: 'add' })} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Target
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Target className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Belum ada target keuangan</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Buat target seperti dana darurat atau membeli laptop, lalu catat setoran tiap kali kamu menabung.
            </p>
            <Button size="sm" onClick={() => setDialog({ kind: 'add' })} className="mt-1 gap-1.5">
              <Plus className="h-4 w-4" /> Tambah Target
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDeposit={(g) => setDialog({ kind: 'deposit', goal: g, mode: 'add' })}
              onWithdraw={(g) => setDialog({ kind: 'deposit', goal: g, mode: 'subtract' })}
              onEdit={(g) => setDialog({ kind: 'edit', goal: g })}
              onDelete={(g) => setDialog({ kind: 'delete', goal: g })}
            />
          ))}
        </div>
      )}

      {/* Add / edit */}
      <Dialog open={dialog?.kind === 'add' || dialog?.kind === 'edit'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.kind === 'edit' ? 'Edit Target' : 'Tambah Target Baru'}</DialogTitle>
            <DialogDescription>Isi nominal target dan, jika ada, tenggat pencapaiannya.</DialogDescription>
          </DialogHeader>
          {(dialog?.kind === 'add' || dialog?.kind === 'edit') && (
            <GoalForm
              initial={dialog.kind === 'edit' ? dialog.goal : undefined}
              onSubmit={(goal) => {
                dispatch({ type: dialog.kind === 'edit' ? 'UPDATE_GOAL' : 'ADD_GOAL', payload: goal });
                closeDialog();
              }}
              onCancel={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Deposit */}
      <Dialog open={dialog?.kind === 'deposit'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog?.kind === 'deposit' && dialog.mode === 'subtract' ? 'Kurangi Dana' : 'Tambah Setoran'}</DialogTitle>
            <DialogDescription>{dialog?.kind === 'deposit' ? dialog.goal.name : ''}</DialogDescription>
          </DialogHeader>
          {dialog?.kind === 'deposit' && (
            <DepositForm
              goal={dialog.goal}
              mode={dialog.mode}
              onSubmit={(amount) => {
                const delta = dialog.mode === 'subtract' ? -amount : amount;
                dispatch({
                  type: 'UPDATE_GOAL',
                  // Round to 2 decimals so cents never drift (e.g. 0.1 + 0.2).
                  payload: { ...dialog.goal, savedAmount: Math.round((dialog.goal.savedAmount + delta) * 100) / 100 },
                });
                closeDialog();
              }}
              onCancel={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={dialog?.kind === 'delete'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Target?</DialogTitle>
            <DialogDescription>
              {dialog?.kind === 'delete' ? `Target "${dialog.goal.name}" ` : 'Target ini '}
              akan dihapus secara permanen dan tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (dialog?.kind === 'delete') dispatch({ type: 'DELETE_GOAL', payload: dialog.goal.id });
                closeDialog();
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
