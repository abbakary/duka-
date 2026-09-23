/** Tanzania Mainland payroll statutory rules (2026 reference). Verify before live runs. */

export const PAYE_BANDS = [
  { upto: 270_000, rate: 0, base: 0, from: 0 },
  { upto: 520_000, rate: 0.08, base: 0, from: 270_000 },
  { upto: 760_000, rate: 0.2, base: 20_000, from: 520_000 },
  { upto: 1_000_000, rate: 0.25, base: 68_000, from: 760_000 },
  { upto: Infinity, rate: 0.3, base: 128_000, from: 1_000_000 },
] as const;

export const TZ_PAYROLL_RATES = {
  nssfEmployee: 0.1,
  nssfEmployer: 0.1,
  nhifEmployee: 0.03,
  nhifEmployer: 0.03,
  sdl: 0.035,
  wcf: 0.005,
  heslb: 0.15,
  sdlHeadcountThreshold: 10,
} as const;

export interface TzPayrollInput {
  basic: number;
  housing: number;
  transport: number;
  heslb: boolean;
  payeEnabled?: boolean;
  nssfEnabled?: boolean;
}

export interface TzPayrollCalc {
  gross: number;
  nssfE: number;
  nssfR: number;
  taxable: number;
  paye: number;
  nhifE: number;
  nhifR: number;
  hes: number;
  net: number;
  sdl: number;
  wcf: number;
  employerCost: number;
  sdlApplies: boolean;
}

export function calcPaye(taxable: number): number {
  for (const b of PAYE_BANDS) {
    if (taxable <= b.upto) {
      return Math.round(b.base + (taxable - b.from) * b.rate);
    }
  }
  return 0;
}

export function calcTzPayroll(input: TzPayrollInput, companyHeadcount: number): TzPayrollCalc {
  const gross = Math.round(input.basic + input.housing + input.transport);
  const nssfEnabled = input.nssfEnabled !== false;
  const payeEnabled = input.payeEnabled !== false;

  const nssfE = nssfEnabled ? Math.round(gross * TZ_PAYROLL_RATES.nssfEmployee) : 0;
  const nssfR = nssfEnabled ? Math.round(gross * TZ_PAYROLL_RATES.nssfEmployer) : 0;
  const taxable = gross - nssfE;
  const paye = payeEnabled ? calcPaye(taxable) : 0;
  const nhifE = Math.round(input.basic * TZ_PAYROLL_RATES.nhifEmployee);
  const nhifR = Math.round(input.basic * TZ_PAYROLL_RATES.nhifEmployer);
  const hes = input.heslb ? Math.round(gross * TZ_PAYROLL_RATES.heslb) : 0;
  const net = gross - nssfE - paye - nhifE - hes;
  const sdlApplies = companyHeadcount >= TZ_PAYROLL_RATES.sdlHeadcountThreshold;
  const sdl = sdlApplies ? Math.round(gross * TZ_PAYROLL_RATES.sdl) : 0;
  const wcf = Math.round(gross * TZ_PAYROLL_RATES.wcf);
  const employerCost = gross + nssfR + nhifR + sdl + wcf;

  return {
    gross,
    nssfE,
    nssfR,
    taxable,
    paye,
    nhifE,
    nhifR,
    hes,
    net,
    sdl,
    wcf,
    employerCost,
    sdlApplies,
  };
}

export function formatTzAmount(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(v));
}

export function payrollPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function currentPayrollPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}
