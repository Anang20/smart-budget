/**
 * InvestmentView.tsx
 * Investment simulator and target calculator. shadcn/ui + Tailwind.
 */
import React, { useState, useMemo } from 'react';
import { Calculator, Target } from 'lucide-react';
import {
  adjustForInflation,
  calculateInvestment,
  calculateScenarios,
  calculateTargetContribution,
  gainPercent,
} from '../lib/calculations';
import { formatPercent, formatRupiah } from '../lib/formatting';
import { validatePositiveNumber, validatePositiveInt, validatePercentage } from '../lib/validation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CurrencyInput } from './ui/currency-input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import GrowthChart from './GrowthChart';
import ScenarioChart from './ScenarioChart';

// ─── Simulator ────────────────────────────────────────────────────────────────

interface SimFields {
  initialCapital: string;
  monthlyContribution: string;
  annualReturnRate: string;
  durationYears: string;
  inflationRate: string;
}

function SimulatorPanel() {
  const [fields, setFields] = useState<SimFields>({
    initialCapital: '10000000',
    monthlyContribution: '1000000',
    annualReturnRate: '8',
    durationYears: '10',
    inflationRate: '3',
  });
  const [errors, setErrors] = useState<Partial<SimFields>>({});
  const [submitted, setSubmitted] = useState(true);

  function update(field: keyof SimFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const e: Partial<SimFields> = {};
    let valid = true;
    const ic = validatePositiveNumber(fields.initialCapital, 'Modal awal');
    if (!ic.isValid) { e.initialCapital = ic.error; valid = false; }
    const mc = validatePositiveNumber(fields.monthlyContribution, 'Kontribusi bulanan');
    if (!mc.isValid) { e.monthlyContribution = mc.error; valid = false; }
    const rr = validatePercentage(fields.annualReturnRate, 'Return tahunan');
    if (!rr.isValid) { e.annualReturnRate = rr.error; valid = false; }
    const dy = validatePositiveInt(fields.durationYears, 'Durasi');
    if (!dy.isValid) { e.durationYears = dy.error; valid = false; }
    const inf = validatePercentage(fields.inflationRate, 'Inflasi tahunan');
    if (!inf.isValid) { e.inflationRate = inf.error; valid = false; }
    setErrors(e);
    return valid;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) setSubmitted(true);
  }

  const result = useMemo(() => {
    if (!submitted) return null;
    const ic = Number(fields.initialCapital);
    const mc = Number(fields.monthlyContribution);
    const rr = Number(fields.annualReturnRate);
    const dy = Number(fields.durationYears);
    const inflation = Number(fields.inflationRate);
    if ([ic, mc, rr, dy, inflation].some(isNaN) || dy <= 0) return null;
    const inputs = { initialCapital: ic, monthlyContribution: mc, annualReturnRate: rr, durationYears: dy };
    const base = calculateInvestment(inputs);
    return {
      ...base,
      gainPercent: gainPercent(base.totalGain, base.totalContributed),
      realValue: adjustForInflation(base.finalValue, inflation, dy),
      scenarios: calculateScenarios(inputs),
      baseRate: rr,
    };
  }, [fields, submitted]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-brand" />
          <CardTitle className="text-base">Simulasi Pertumbuhan Investasi</CardTitle>
        </div>
        <CardDescription>Hitung nilai investasi di masa depan dengan bunga majemuk bulanan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sim-ic">Modal Awal (Rp)</Label>
              <CurrencyInput id="sim-ic" value={fields.initialCapital}
                onValueChange={(raw) => { update('initialCapital', raw); setSubmitted(false); }}
                className={errors.initialCapital ? 'border-destructive' : ''}
              />
              {errors.initialCapital && <p className="text-xs text-destructive">{errors.initialCapital}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-mc">Kontribusi Bulanan (Rp)</Label>
              <CurrencyInput id="sim-mc" value={fields.monthlyContribution}
                onValueChange={(raw) => { update('monthlyContribution', raw); setSubmitted(false); }}
                className={errors.monthlyContribution ? 'border-destructive' : ''}
              />
              {errors.monthlyContribution && <p className="text-xs text-destructive">{errors.monthlyContribution}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-rr">Return Tahunan (%)</Label>
              <Input id="sim-rr" type="number" min="0" max="100" step="0.1" value={fields.annualReturnRate}
                onChange={(e) => { update('annualReturnRate', e.target.value); setSubmitted(false); }}
                className={errors.annualReturnRate ? 'border-destructive' : ''}
              />
              {errors.annualReturnRate && <p className="text-xs text-destructive">{errors.annualReturnRate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-dy">Durasi (Tahun)</Label>
              <Input id="sim-dy" type="number" min="1" max="50" step="1" value={fields.durationYears}
                onChange={(e) => { update('durationYears', e.target.value); setSubmitted(false); }}
                className={errors.durationYears ? 'border-destructive' : ''}
              />
              {errors.durationYears && <p className="text-xs text-destructive">{errors.durationYears}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-inf">Inflasi Tahunan (%)</Label>
              <Input id="sim-inf" type="number" min="0" max="100" step="0.1" value={fields.inflationRate}
                onChange={(e) => { update('inflationRate', e.target.value); setSubmitted(false); }}
                className={errors.inflationRate ? 'border-destructive' : ''}
                aria-describedby="sim-inf-hint"
              />
              {errors.inflationRate
                ? <p className="text-xs text-destructive">{errors.inflationRate}</p>
                : <p id="sim-inf-hint" className="text-xs text-muted-foreground">Dipakai untuk menghitung nilai riil.</p>}
            </div>
          </div>
          <div className="flex sm:justify-end">
            <Button type="submit" className="w-full sm:w-auto">Hitung Simulasi</Button>
          </div>
        </form>

        {result && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <div className="rounded-2xl bg-tint-lime p-4">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Nilai Akhir</div>
                <div className="break-words text-lg font-bold text-brand sm:text-xl">{formatRupiah(result.finalValue)}</div>
              </div>
              <div className="rounded-2xl bg-tint-blue p-4">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Modal Disetor</div>
                <div className="break-words text-lg font-bold sm:text-xl">{formatRupiah(result.totalContributed)}</div>
              </div>
              <div className="rounded-2xl bg-tint-mint p-4">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Total Keuntungan</div>
                <div className="break-words text-lg font-bold text-success sm:text-xl">{formatRupiah(result.totalGain)}</div>
                {result.gainPercent !== null && (
                  <div className="mt-1 text-xs font-medium text-success">
                    +{formatPercent(result.gainPercent)} dari modal disetor
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-tint-yellow p-4">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Nilai Riil</div>
                <div className="break-words text-lg font-bold sm:text-xl">{formatRupiah(result.realValue)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Daya beli setara hari ini</div>
              </div>
            </div>

            <div className="mt-6">
              <GrowthChart projections={result.yearlyProjections} />
            </div>

            <div className="mt-6 border-t pt-6">
              <h4 className="text-sm font-semibold">Perbandingan Skenario</h4>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">
                Rencana yang sama dengan return dikurangi dan ditambah 3 poin persentase dari asumsimu.
              </p>
              <ScenarioChart points={result.scenarios} baseRate={result.baseRate} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Target calculator ────────────────────────────────────────────────────────

interface TargetFields {
  targetAmount: string;
  annualReturnRate: string;
  durationYears: string;
  initialCapital: string;
}

function TargetCalculatorPanel() {
  const [fields, setFields] = useState<TargetFields>({
    targetAmount: '500000000',
    annualReturnRate: '8',
    durationYears: '20',
    initialCapital: '10000000',
  });
  const [errors, setErrors] = useState<Partial<TargetFields>>({});
  const [submitted, setSubmitted] = useState(true);

  function update(field: keyof TargetFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const e: Partial<TargetFields> = {};
    let valid = true;
    const ta = validatePositiveNumber(fields.targetAmount, 'Target nilai');
    if (!ta.isValid) { e.targetAmount = ta.error; valid = false; }
    const rr = validatePercentage(fields.annualReturnRate, 'Return tahunan');
    if (!rr.isValid) { e.annualReturnRate = rr.error; valid = false; }
    const dy = validatePositiveInt(fields.durationYears, 'Durasi');
    if (!dy.isValid) { e.durationYears = dy.error; valid = false; }
    const ic = validatePositiveNumber(fields.initialCapital, 'Modal awal');
    if (!ic.isValid) { e.initialCapital = ic.error; valid = false; }
    setErrors(e);
    return valid;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) setSubmitted(true);
  }

  const monthlyNeeded = useMemo(() => {
    if (!submitted) return null;
    const ta = Number(fields.targetAmount);
    const rr = Number(fields.annualReturnRate);
    const dy = Number(fields.durationYears);
    const ic = Number(fields.initialCapital);
    if ([ta, rr, dy, ic].some(isNaN) || dy <= 0) return null;
    return calculateTargetContribution({ targetAmount: ta, annualReturnRate: rr, durationYears: dy, initialCapital: ic });
  }, [fields, submitted]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-brand" />
          <CardTitle className="text-base">Kalkulator Target Investasi</CardTitle>
        </div>
        <CardDescription>
          Hitung kontribusi bulanan yang dibutuhkan untuk mencapai nilai target.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tgt-ta">Nilai Target (Rp)</Label>
              <CurrencyInput id="tgt-ta" value={fields.targetAmount}
                onValueChange={(raw) => { update('targetAmount', raw); setSubmitted(false); }}
                className={errors.targetAmount ? 'border-destructive' : ''}
              />
              {errors.targetAmount && <p className="text-xs text-destructive">{errors.targetAmount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tgt-ic">Modal Awal (Rp)</Label>
              <CurrencyInput id="tgt-ic" value={fields.initialCapital}
                onValueChange={(raw) => { update('initialCapital', raw); setSubmitted(false); }}
                className={errors.initialCapital ? 'border-destructive' : ''}
              />
              {errors.initialCapital && <p className="text-xs text-destructive">{errors.initialCapital}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tgt-rr">Return Tahunan (%)</Label>
              <Input id="tgt-rr" type="number" min="0" max="100" step="0.1" value={fields.annualReturnRate}
                onChange={(e) => { update('annualReturnRate', e.target.value); setSubmitted(false); }}
                className={errors.annualReturnRate ? 'border-destructive' : ''}
              />
              {errors.annualReturnRate && <p className="text-xs text-destructive">{errors.annualReturnRate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tgt-dy">Durasi (Tahun)</Label>
              <Input id="tgt-dy" type="number" min="1" max="50" step="1" value={fields.durationYears}
                onChange={(e) => { update('durationYears', e.target.value); setSubmitted(false); }}
                className={errors.durationYears ? 'border-destructive' : ''}
              />
              {errors.durationYears && <p className="text-xs text-destructive">{errors.durationYears}</p>}
            </div>
          </div>
          <div className="flex sm:justify-end">
            <Button type="submit" className="w-full sm:w-auto">Hitung Kontribusi</Button>
          </div>
        </form>

        {monthlyNeeded !== null && (
          <Alert variant="info" className="mt-4">
            <AlertDescription>
              <span className="text-muted-foreground">Kontribusi bulanan yang dibutuhkan:</span>{' '}
              <span className="text-lg font-bold text-brand">{formatRupiah(monthlyNeeded)}</span>
              {' '}<span className="text-muted-foreground">/bulan</span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── InvestmentView ───────────────────────────────────────────────────────────

export default function InvestmentView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perencana Investasi</h1>
        <p className="text-muted-foreground text-sm mt-1">Simulasi dan target investasi jangka panjang.</p>
      </div>

      <Alert variant="warning">
        <AlertDescription>
          <strong>Perhatian:</strong> Hasil simulasi hanyalah proyeksi berdasarkan asumsi, bukan saran atau jaminan investasi.
        </AlertDescription>
      </Alert>

      <SimulatorPanel />
      <TargetCalculatorPanel />
    </div>
  );
}
