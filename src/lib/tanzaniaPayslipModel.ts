import type { PayrollEmployerSettings } from '@/lib/payrollEmployerSettings';
import { formatTzAmount, payrollPeriodLabel } from '@/lib/tzPayrollStatutory';
import type { TzPayrollCalc } from '@/lib/tzPayrollStatutory';

export interface TanzaniaPayslipModel {
  brandShort: string;
  brandSubline: string;
  periodLabel: string;
  payslipNo: string;
  payDateLabel: string;
  employeeName: string;
  nssfNo: string;
  position: string;
  bankLine: string;
  department: string;
  accountNo: string;
  tin: string;
  payBasis: string;
  basic: string;
  housing: string;
  transport: string;
  gross: string;
  nssfDeduction: string;
  payeDeduction: string;
  payeTaxableNote: string;
  nhifDeduction: string;
  heslbLabel: string;
  heslbAmount: string;
  heslbDim: boolean;
  totalDeductions: string;
  netPay: string;
  paidByLine: string;
  valueDateLine: string;
  employerLegal: string;
  employerTin: string;
  employerNssf: string;
  employerCostLine: string;
  signatureDataUrl?: string;
  sealRingText: string;
  finePrint: string;
}

export function payslipNumberFor(period: string, brandCode: string, seq: number): string {
  const year = period.slice(0, 4) || '2026';
  const tail = String(seq).padStart(4, '0');
  const slug = brandCode.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'JM';
  return `${slug}/PSL/${year}/${tail}`;
}

export function brandCodeFromEmployer(brandShort: string): string {
  const parts = brandShort.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return brandShort.slice(0, 2).toUpperCase() || 'JM';
}

export function defaultPayDate(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return new Date().toLocaleDateString('en-GB');
  const d = new Date(y, m, 0);
  return d.toLocaleDateString('en-GB');
}

export function buildTanzaniaPayslipModel(input: {
  period: string;
  payslipSeq: number;
  employeeName: string;
  department: string;
  jobTitle: string;
  contractType: string;
  tin: string;
  nssfNo: string;
  bankName: string;
  bankBranch?: string;
  bankAccount: string;
  basic: number;
  housing: number;
  transport: number;
  heslb: boolean;
  calc: TzPayrollCalc;
  employer: PayrollEmployerSettings;
}): TanzaniaPayslipModel {
  const c = input.calc;
  const totalDed = c.nssfE + c.paye + c.nhifE + c.hes;
  const bankDisplay = [input.bankName, input.bankBranch].filter(Boolean).join(', ') || input.bankName;
  const payDate = defaultPayDate(input.period);
  const brandCode = brandCodeFromEmployer(input.employer.brandShort);
  const costParts = [
    formatTzAmount(c.gross),
    `NSSF ${formatTzAmount(c.nssfR)}`,
    `NHIF ${formatTzAmount(c.nhifR)}`,
    `WCF ${formatTzAmount(c.wcf)}`,
  ];
  if (c.sdlApplies) costParts.push(`SDL ${formatTzAmount(c.sdl)}`);

  return {
    brandShort: input.employer.brandShort,
    brandSubline: input.employer.brandSubline,
    periodLabel: payrollPeriodLabel(input.period),
    payslipNo: payslipNumberFor(input.period, brandCode, input.payslipSeq),
    payDateLabel: `Pay date ${payDate.replace(/\//g, '/')}`,
    employeeName: input.employeeName,
    nssfNo: input.nssfNo || '—',
    position: `${input.jobTitle}${input.jobTitle && input.department ? ', ' : ''}${input.department}`,
    bankLine: bankDisplay,
    department: input.department || '—',
    accountNo: input.bankAccount || '—',
    tin: input.tin || '—',
    payBasis: `Monthly, ${input.contractType.toLowerCase()}`,
    basic: formatTzAmount(input.basic),
    housing: formatTzAmount(input.housing),
    transport: formatTzAmount(input.transport),
    gross: formatTzAmount(c.gross),
    nssfDeduction: `(${formatTzAmount(c.nssfE)})`,
    payeDeduction: `(${formatTzAmount(c.paye)})`,
    payeTaxableNote: formatTzAmount(c.taxable),
    nhifDeduction: `(${formatTzAmount(c.nhifE)})`,
    heslbDim: !input.heslb,
    heslbLabel: input.heslb
      ? 'HESLB loan repayment — 15% of gross'
      : 'HESLB loan repayment — no loan on record',
    heslbAmount: input.heslb ? `(${formatTzAmount(c.hes)})` : 'n/a',
    totalDeductions: `(${formatTzAmount(totalDed)})`,
    netPay: `${formatTzAmount(c.net)} TZS`,
    paidByLine: `Paid by bank transfer to ${bankDisplay}, account ${input.bankAccount || '—'}`,
    valueDateLine: `Value date ${payDate}`,
    employerLegal: input.employer.legalName,
    employerTin: input.employer.employerTin,
    employerNssf: input.employer.employerNssfNo,
    employerCostLine: `${costParts.join(' + ')} = ${formatTzAmount(c.employerCost)}`,
    signatureDataUrl: input.employer.authorizedSignatureDataUrl,
    sealRingText: `${input.employer.brandShort.replace(/\s+/g, ' ')} · DAR ES SALAAM · EST ${input.employer.sealEstYear ?? '2011'} · `,
    finePrint:
      'Calculated under Tanzania Mainland statutory rates in force: PAYE progressive bands from TRA, NSSF 10% employee / 10% employer, NHIF / Universal Health Insurance 3% employee / 3% employer, HESLB 15% of gross for registered loan beneficiaries only. This is a computer-generated payslip and is valid without a wet signature when issued from payroll records.',
  };
}
