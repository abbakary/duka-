import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calcTzPayroll,
  currentPayrollPeriod,
  formatTzAmount,
  payrollPeriodLabel,
  TZ_PAYROLL_RATES,
} from '@/lib/tzPayrollStatutory';
import { EnterpriseWorkspaceShell } from '@/components/v1/workspace/EnterpriseWorkspaceShell';
import { StaffAvatar } from '@/components/v1/hr/StaffAvatar';
import { DigitalSignatureModal } from '@/components/v1/payroll/DigitalSignatureModal';
import { TanzaniaPayslipView, printTanzaniaPayslipElement } from '@/components/v1/payroll/TanzaniaPayslipView';
import { ModalPortal } from '@/components/ui/ModalPortal';
import type { StaffPayrollConfig } from '@/lib/payrollStore';
import {
  loadPayrollEmployerSettings,
  mergeEmployerFromBusiness,
  savePayrollEmployerSettings,
} from '@/lib/payrollEmployerSettings';
import { buildTanzaniaPayslipModel } from '@/lib/tanzaniaPayslipModel';
import {
  fetchEmployerSettingsFromApi,
  pushEmployerSettingsToApi,
  pushPayrollContractToApi,
} from '@/lib/payrollApiSync';
import { canPostPayrollAccounting, canRunPayrollOperations, canSignPayslips } from '@/lib/rbac';
import { api } from '@/lib/api';
import type { AuthUser, Language, StaffMember } from '@/types/v1';

export type PayrollViewId =
  | 'employees'
  | 'contract'
  | 'run'
  | 'payslip'
  | 'paye'
  | 'nssf'
  | 'sdlwcf'
  | 'heslb'
  | 'nhif'
  | 'rates';

interface PayrollEmployeeRow {
  id: string;
  name: string;
  dept: string;
  title: string;
  type: string;
  hire: string;
  basic: number;
  house: number;
  transport: number;
  heslb: boolean;
  bank: string;
  bankBranch: string;
  acct: string;
  tin: string;
  nssfNo: string;
  nssfEnabled: boolean;
  payeEnabled: boolean;
  calc: ReturnType<typeof calcTzPayroll>;
}

interface PayrollTanzaniaHubProps {
  language: Language;
  staffList: StaffMember[];
  staffConfig: Record<string, StaffPayrollConfig>;
  onStaffConfigChange: (next: Record<string, StaffPayrollConfig>) => void;
  businessName?: string;
  branchName?: string;
  branchId?: string | null;
  onNavigateToAccounting?: () => void;
  onOpenStaffRecord?: (staffId: string) => void;
  onShowToast?: (msg: string) => void;
  tenantId?: string;
  currentUser?: AuthUser | null;
}

const RAIL: { id: PayrollViewId; group: string; nameEn: string; nameSw: string }[] = [
  { id: 'employees', group: 'Employees', nameEn: 'Employees', nameSw: 'Wafanyakazi' },
  { id: 'contract', group: 'Employees', nameEn: 'Contract and salary structure', nameSw: 'Mkataba na mshahara' },
  { id: 'run', group: 'Payroll', nameEn: 'Payroll run', nameSw: 'Mizunguko ya mishahara' },
  { id: 'payslip', group: 'Payroll', nameEn: 'Payslips', nameSw: 'Slip za mshahara' },
  { id: 'paye', group: 'Statutory reports', nameEn: 'TRA PAYE return', nameSw: 'PAYE (TRA)' },
  { id: 'nssf', group: 'Statutory reports', nameEn: 'NSSF contribution schedule', nameSw: 'NSSF' },
  { id: 'sdlwcf', group: 'Statutory reports', nameEn: 'SDL and WCF', nameSw: 'SDL na WCF' },
  { id: 'heslb', group: 'Statutory reports', nameEn: 'HESLB loan deductions', nameSw: 'HESLB' },
  { id: 'nhif', group: 'Statutory reports', nameEn: 'NHIF / Universal Health Insurance', nameSw: 'NHIF / UHI' },
  { id: 'rates', group: 'Configuration', nameEn: 'Statutory rates (Tanzania)', nameSw: 'Viwango vya kisheria' },
];

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function deptFromRole(role?: string): string {
  const r = (role || '').toLowerCase();
  if (r.includes('sales') || r.includes('cashier')) return 'Sales';
  if (r.includes('manager') || r.includes('owner')) return 'Management';
  if (r.includes('warehouse') || r.includes('stock')) return 'Warehouse';
  if (r.includes('hr') || r.includes('people')) return 'Human Resources';
  if (r.includes('it')) return 'IT';
  return 'Operations';
}

export const PayrollTanzaniaHub: React.FC<PayrollTanzaniaHubProps> = ({
  language,
  staffList,
  staffConfig,
  onStaffConfigChange,
  businessName = 'Your company',
  branchName,
  branchId = null,
  onNavigateToAccounting,
  onOpenStaffRecord,
  onShowToast,
  tenantId,
  currentUser,
}) => {
  const isSw = language === 'sw';
  const tid = tenantId || currentUser?.businessId || currentUser?.id || 'local';
  const [view, setView] = useState<PayrollViewId>('employees');
  const [empId, setEmpId] = useState<string | null>(null);
  const [period, setPeriod] = useState(currentPayrollPeriod());
  const [runStatus, setRunStatus] = useState<'draft' | 'confirmed' | 'posted'>('draft');
  const [busy, setBusy] = useState(false);
  const [contractEditOpen, setContractEditOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [employerSigVersion, setEmployerSigVersion] = useState(0);
  const canRun = canRunPayrollOperations(currentUser);
  const canPostAcct = canPostPayrollAccounting(currentUser);
  const canSign = canSignPayslips(currentUser);
  const staffById = useMemo(() => new Map(staffList.map(s => [s.id, s])), [staffList]);
  const activeStaff = useMemo(() => staffList.filter(s => s.active !== false), [staffList]);
  const headcount = activeStaff.length;

  const employees: PayrollEmployeeRow[] = useMemo(() => {
    return activeStaff.map(s => {
      const cfg = staffConfig[s.id] ?? {};
      const basic = cfg.baseSalary ?? s.baseSalary ?? 450_000;
      const house =
        cfg.housingAllowanceMonthly ??
        Math.round(basic * 0.12);
      const transport =
        cfg.transportAllowanceMonthly ??
        Math.round((cfg.dailyTransportAllowance ?? s.dailyTransportAllowance ?? 3000) * 22);
      const row: Omit<PayrollEmployeeRow, 'calc'> = {
        id: s.id,
        name: s.name,
        dept: cfg.department || deptFromRole(s.role),
        title: cfg.jobTitle || s.role || (isSw ? 'Mfanyakazi' : 'Staff member'),
        type: cfg.contractType || (isSw ? 'Kudumu' : 'Permanent'),
        hire: cfg.hireDate || s.joinedDate || '2023-01-01',
        basic,
        house,
        transport,
        heslb: Boolean(cfg.heslb),
        bank: cfg.bankName || 'CRDB Bank',
        bankBranch: cfg.bankBranch || 'Kariakoo',
        acct: cfg.bankAccount || s.accountNumberOrPhone || '—',
        tin: cfg.tin || '109-xxx-000',
        nssfNo: cfg.nssfNumber || s.nssfNumber || `TZ-NSSF-${s.id.replace(/-/g, '').slice(0, 8)}`,
        nssfEnabled: cfg.nssfEnabled !== false,
        payeEnabled: cfg.payeEnabled !== false,
      };
      const calc = calcTzPayroll(
        {
          basic: row.basic,
          housing: row.house,
          transport: row.transport,
          heslb: row.heslb,
          nssfEnabled: row.nssfEnabled,
          payeEnabled: row.payeEnabled,
        },
        headcount,
      );
      return { ...row, calc };
    });
  }, [activeStaff, staffConfig, headcount, isSw]);

  useEffect(() => {
    if (!empId && employees.length) setEmpId(employees[0].id);
    if (empId && !employees.some(e => e.id === empId)) setEmpId(employees[0]?.id ?? null);
  }, [employees, empId]);

  const selected = employees.find(e => e.id === empId) ?? employees[0];

  const totals = useMemo(() => {
    let tG = 0,
      tNssfE = 0,
      tNssfR = 0,
      tPaye = 0,
      tNhifE = 0,
      tNhifR = 0,
      tHes = 0,
      tSdl = 0,
      tWcf = 0,
      tNet = 0,
      tCost = 0;
    employees.forEach(e => {
      const c = e.calc;
      tG += c.gross;
      tNssfE += c.nssfE;
      tNssfR += c.nssfR;
      tPaye += c.paye;
      tNhifE += c.nhifE;
      tNhifR += c.nhifR;
      tHes += c.hes;
      tSdl += c.sdl;
      tWcf += c.wcf;
      tNet += c.net;
      tCost += c.employerCost;
    });
    return { tG, tNssfE, tNssfR, tPaye, tNhifE, tNhifR, tHes, tSdl, tWcf, tNet, tCost };
  }, [employees]);

  const toast = (msg: string) => onShowToast?.(msg);

  const persistContract = (draft: Partial<PayrollEmployeeRow> & { id: string }) => {
    const prev = staffConfig[draft.id] ?? {};
    const nextCfg = {
      ...prev,
      baseSalary: draft.basic ?? prev.baseSalary,
      housingAllowanceMonthly: draft.house ?? prev.housingAllowanceMonthly,
      transportAllowanceMonthly: draft.transport ?? prev.transportAllowanceMonthly,
      heslb: draft.heslb ?? prev.heslb,
      tin: draft.tin ?? prev.tin,
      bankName: draft.bank ?? prev.bankName,
      bankBranch: draft.bankBranch ?? prev.bankBranch,
      bankAccount: draft.acct ?? prev.bankAccount,
      nssfNumber: draft.nssfNo ?? prev.nssfNumber,
      department: draft.dept ?? prev.department,
      jobTitle: draft.title ?? prev.jobTitle,
      contractType: draft.type ?? prev.contractType,
      hireDate: draft.hire ?? prev.hireDate,
      nssfEnabled: draft.nssfEnabled ?? prev.nssfEnabled,
      payeEnabled: draft.payeEnabled ?? prev.payeEnabled,
    };
    onStaffConfigChange({
      ...staffConfig,
      [draft.id]: nextCfg,
    });
    void pushPayrollContractToApi(draft.id, draft.name || selected?.name || '', nextCfg).catch(() => undefined);
    toast(isSw ? 'Mkataba umehifadhiwa.' : 'Contract saved.');
    setContractEditOpen(false);
  };

  const runPayroll = async () => {
    setBusy(true);
    try {
      const staffPayload = employees.map((e, idx) => {
        const slipNo = buildTanzaniaPayslipModel({
          period,
          payslipSeq: idx + 1,
          employeeName: e.name,
          department: e.dept,
          jobTitle: e.title,
          contractType: e.type,
          tin: e.tin,
          nssfNo: e.nssfNo,
          bankName: e.bank,
          bankBranch: e.bankBranch,
          bankAccount: e.acct,
          basic: e.basic,
          housing: e.house,
          transport: e.transport,
          heslb: e.heslb,
          calc: e.calc,
          employer: employerForPayslip,
        }).payslipNo;
        return {
        staff_id: e.id,
        staff_name: e.name,
        gross_pay: e.calc.gross,
        deductions: e.calc.nssfE + e.calc.paye + e.calc.nhifE + e.calc.hes,
        net_pay: e.calc.net,
        payslip_number: slipNo,
        status: 'confirmed',
        lines: [
          { label: 'Basic salary', amount: e.basic, kind: 'earning' },
          { label: 'Housing allowance', amount: e.house, kind: 'earning' },
          { label: 'Transport allowance', amount: e.transport, kind: 'earning' },
          { label: 'NSSF employee 10%', amount: -e.calc.nssfE, kind: 'deduction' },
          { label: 'PAYE', amount: -e.calc.paye, kind: 'deduction' },
          { label: 'NHIF employee 3%', amount: -e.calc.nhifE, kind: 'deduction' },
          ...(e.heslb ? [{ label: 'HESLB 15%', amount: -e.calc.hes, kind: 'deduction' }] : []),
        ],
      };
      });
      if (api.hasValidSession()) {
        await api.runPayrollPayslips({ period, staff: staffPayload });
      }
      setRunStatus('confirmed');
      toast(isSw ? 'Mishahara imethibitishwa kwa kipindi.' : 'Payroll confirmed for the period.');
    } catch (e) {
      toast(e instanceof Error ? e.message : isSw ? 'Imeshindwa.' : 'Payroll run failed.');
    } finally {
      setBusy(false);
    }
  };

  const postToAccounting = async () => {
    setBusy(true);
    try {
      const payload = {
        period,
        gross: totals.tG,
        net: totals.tNet,
        paye: totals.tPaye,
        nssf_total: totals.tNssfE + totals.tNssfR,
        nhif_total: totals.tNhifE + totals.tNhifR,
        heslb: totals.tHes,
        sdl: totals.tSdl,
        wcf: totals.tWcf,
        employer_statutory: totals.tNssfR + totals.tNhifR + totals.tSdl + totals.tWcf,
      };
      if (api.hasValidSession()) {
        await api.postPayrollToAccounting({ ...payload, branch_id: branchId });
      } else {
        await api.createJournalEntry({
          entry_date: new Date().toISOString().slice(0, 10),
          reference: `PAYROLL-${period}`,
          memo: `${payrollPeriodLabel(period)} payroll (local session)`,
          lines: [
            { account_code: '6200', label: 'Gross salaries', debit: totals.tG, credit: 0 },
            { account_code: '6200', label: 'Employer statutory', debit: payload.employer_statutory, credit: 0 },
            { account_code: '1100', label: 'Net pay', debit: 0, credit: totals.tNet },
            { account_code: '2200', label: 'NSSF payable', debit: 0, credit: payload.nssf_total },
            {
              account_code: '2000',
              label: 'Statutory withholdings & levies',
              debit: 0,
              credit: totals.tPaye + totals.tNhifE + totals.tNhifR + totals.tHes + totals.tSdl + totals.tWcf,
            },
          ],
        });
      }
      setRunStatus('posted');
      toast(isSw ? 'Imechapishwa kwenye uhasibu.' : 'Posted to accounting.');
    } catch (e) {
      toast(e instanceof Error ? e.message : isSw ? 'Uhasibu umeshindwa.' : 'Accounting post failed.');
    } finally {
      setBusy(false);
    }
  };

  const exportBankFile = () => {
    const header = 'Employee,Account,Bank,Net TZS,Reference\n';
    const rows = employees
      .map(
        e =>
          `"${e.name.replace(/"/g, '""')}","${e.acct}","${e.bank}",${e.calc.net},"SAL-${period}-${e.id.slice(0, 8)}"`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-payroll-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(isSw ? 'Faili ya benki imepakuliwa.' : 'Bank file downloaded.');
  };

  const exportPayeCsv = () => {
    const header = 'Employee,TIN,Gross,Less NSSF,Taxable,PAYE\n';
    const rows = employees
      .map(
        e =>
          `"${e.name}","${e.tin}",${e.calc.gross},${e.calc.nssfE},${e.calc.taxable},${e.calc.paye}`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paye-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(isSw ? 'Ratiba ya PAYE imepakuliwa.' : 'PAYE schedule downloaded.');
  };

  const employerForPayslip = useMemo(() => {
    void employerSigVersion;
    const merged = mergeEmployerFromBusiness(tid, businessName);
    const stored = loadPayrollEmployerSettings(tid);
    return { ...merged, authorizedSignatureDataUrl: stored.authorizedSignatureDataUrl };
  }, [tid, businessName, employerSigVersion]);

  const payslipModel = useMemo(() => {
    if (!selected) return null;
    const seq = Math.max(1, employees.findIndex(e => e.id === selected.id) + 1);
    return buildTanzaniaPayslipModel({
      period,
      payslipSeq: seq,
      employeeName: selected.name,
      department: selected.dept,
      jobTitle: selected.title,
      contractType: selected.type,
      tin: selected.tin,
      nssfNo: selected.nssfNo,
      bankName: selected.bank,
      bankBranch: selected.bankBranch,
      bankAccount: selected.acct,
      basic: selected.basic,
      housing: selected.house,
      transport: selected.transport,
      heslb: selected.heslb,
      calc: selected.calc,
      employer: employerForPayslip,
    });
  }, [selected, period, employees, employerForPayslip]);

  const doPrintPayslip = useCallback(() => {
    printTanzaniaPayslipElement('tz-payslip-print-root');
  }, []);

  const printPayslip = useCallback(() => {
    if (!selected || !payslipModel) return;
    const em = loadPayrollEmployerSettings(tid);
    if (canSign && !em.authorizedSignatureDataUrl) {
      setSignatureOpen(true);
      return;
    }
    doPrintPayslip();
  }, [selected, payslipModel, canSign, tid, doPrintPayslip]);

  const saveEmployerSignature = (dataUrl: string) => {
    const em = loadPayrollEmployerSettings(tid);
    const next = {
      ...em,
      authorizedSignatureDataUrl: dataUrl,
      signatureCapturedAt: new Date().toISOString(),
      signatureCapturedBy: currentUser?.name || currentUser?.email || 'HR',
    };
    savePayrollEmployerSettings(tid, next);
    void pushEmployerSettingsToApi(next).catch(() => undefined);
    setEmployerSigVersion(v => v + 1);
    toast(isSw ? 'Saini imehifadhiwa.' : 'Signature saved for payslips.');
    window.setTimeout(doPrintPayslip, 200);
  };

  useEffect(() => {
    if (!api.hasValidSession()) return;
    const local = loadPayrollEmployerSettings(tid);
    void fetchEmployerSettingsFromApi(tid, local).then(() => setEmployerSigVersion(v => v + 1));
  }, [tid]);

  const railLabel = (id: PayrollViewId) => {
    const row = RAIL.find(r => r.id === id);
    return row ? (isSw ? row.nameSw : row.nameEn) : id;
  };

  const sheetHead = (title: string, sub?: string, tools?: React.ReactNode) => (
    <div className="flex flex-wrap items-start gap-3 border-b border-[#dee2e6] px-5 py-4">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-xl font-medium">{title}</h1>
        {sub ? <p className="mt-0.5 text-[#6c757d] text-sm">{sub}</p> : null}
      </div>
      {tools ? <div className="ml-auto flex flex-wrap items-center gap-2">{tools}</div> : null}
    </div>
  );

  const kpis = (items: { l: string; v: string; s?: string }[]) => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 px-5 py-2.5">
      {items.map(k => (
        <div key={k.l} className="rounded-md border border-[#dee2e6] bg-[#f7f8fa] px-3.5 py-2.5">
          <div className="text-xs text-[#6c757d]">{k.l}</div>
          <div className="mt-0.5 text-xl font-medium">{k.v}</div>
          {k.s ? <div className="text-xs text-[#6c757d]">{k.s}</div> : null}
        </div>
      ))}
    </div>
  );

  const renderSheet = () => {
    const periodLabel = payrollPeriodLabel(period);
    const statusLabel =
      runStatus === 'posted'
        ? isSw
          ? 'Imechapishwa uhasibuni'
          : 'Posted to accounting'
        : runStatus === 'confirmed'
          ? isSw
            ? 'Imethibitishwa, tayari kulipa'
            : 'Confirmed, ready to pay'
          : isSw
            ? 'Rasimu'
            : 'Draft';

    switch (view) {
      case 'employees':
        return (
          <>
            {sheetHead(
              isSw ? 'Wafanyakazi' : 'Employees',
              isSw
                ? `Tanzania Bara, wafanyakazi ${employees.length} hai`
                : `Mainland Tanzania, ${employees.length} active employees`,
              onOpenStaffRecord ? (
                <button
                  type="button"
                  className="rounded border border-[#dee2e6] bg-[#714b67] px-3 py-1.5 text-white text-sm cursor-pointer"
                  onClick={() => onOpenStaffRecord('new')}
                >
                  {isSw ? 'Ongeza mfanyakazi' : 'Add employee'}
                </button>
              ) : null,
            )}
            {kpis([
              { l: isSw ? 'Idadi' : 'Headcount', v: String(employees.length) },
              { l: isSw ? 'Jumla ya mshahara' : 'Monthly gross payroll', v: `${formatTzAmount(totals.tG)} TZS` },
              {
                l: 'HESLB',
                v: String(employees.filter(e => e.heslb).length),
                s: isSw ? 'wanufaika' : 'beneficiaries',
              },
              {
                l: 'SDL',
                v:
                  headcount >= TZ_PAYROLL_RATES.sdlHeadcountThreshold
                    ? isSw
                      ? 'Ndiyo (10+)'
                      : 'Yes, 10+ staff'
                    : isSw
                      ? 'Hapana'
                      : 'No, under 10',
              },
            ])}
            <div className="overflow-x-auto py-2">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-[#dee2e6] text-[#6c757d]">
                    <th className="py-2 pl-5 text-left font-medium">{isSw ? 'Mfanyakazi' : 'Employee'}</th>
                    <th className="px-2 text-left font-medium">{isSw ? 'Idara' : 'Department'}</th>
                    <th className="px-2 text-left font-medium">{isSw ? 'Cheo' : 'Job title'}</th>
                    <th className="px-2 text-right font-medium">{isSw ? 'Jumla/mwezi' : 'Monthly gross'}</th>
                    <th className="pr-5 text-left font-medium">{isSw ? 'Alama' : 'Flags'}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr
                      key={e.id}
                      className="cursor-pointer border-b border-[#dee2e6] hover:bg-[#f3f0f2]"
                      onClick={() => {
                        setEmpId(e.id);
                        setView('contract');
                      }}
                    >
                      <td className="py-1.5 pl-5">
                        <span className="inline-flex items-center gap-2">
                          <StaffAvatar staff={staffById.get(e.id) ?? { name: e.name, role: 'Cashier' }} size="sm" />
                          {e.name}
                        </span>
                      </td>
                      <td className="px-2">{e.dept}</td>
                      <td className="px-2">{e.title}</td>
                      <td className="px-2 text-right whitespace-nowrap">{formatTzAmount(e.calc.gross)}</td>
                      <td className="pr-5">
                        {e.heslb ? (
                          <span className="rounded-xl bg-[#fbf1dc] px-2 py-0.5 text-xs text-[#8a5a00]">HESLB</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 pb-4 text-xs text-[#6c757d]">
              {isSw
                ? 'Bofya mfanyakazi kufungua mkataba na slip. Thibitisha viwango na TRA, NSSF, NHIF na HESLB kabla ya kulipa.'
                : 'Select an employee to open contract and payslip. Confirm rates with TRA, NSSF, NHIF and HESLB before paying live.'}
            </p>
          </>
        );

      case 'contract':
        if (!selected) {
          return sheetHead(isSw ? 'Hakuna wafanyakazi' : 'No employees', isSw ? 'Ongeza wafanyakazi kwanza.' : 'Add staff first.');
        }
        return (
          <>
            {sheetHead(
              isSw ? 'Mkataba na muundo wa mshahara' : 'Contract and salary structure',
              undefined,
              <>
                <select
                  className="rounded border border-[#dee2e6] px-2 py-1.5 text-sm"
                  value={selected.id}
                  onChange={ev => setEmpId(ev.target.value)}
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded border border-[#dee2e6] px-3 py-1.5 text-sm cursor-pointer hover:bg-[#f3f0f2]"
                  onClick={() => setContractEditOpen(true)}
                >
                  {isSw ? 'Hariri mkataba' : 'Edit contract'}
                </button>
                {onOpenStaffRecord ? (
                  <button
                    type="button"
                    className="rounded border border-[#dee2e6] px-3 py-1.5 text-sm cursor-pointer"
                    onClick={() => onOpenStaffRecord(selected.id)}
                  >
                    {isSw ? 'Rekodi ya HR' : 'HR record'}
                  </button>
                ) : null}
              </>,
            )}
            <div className="mx-5 my-3 rounded-md border border-[#dee2e6] bg-[#f7f8fa] p-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  {[
                    [isSw ? 'Mfanyakazi' : 'Employee', selected.name],
                    [isSw ? 'Idara' : 'Department', selected.dept],
                    [isSw ? 'Cheo' : 'Job title', selected.title],
                    [isSw ? 'Aina ya mkataba' : 'Contract type', selected.type],
                    [isSw ? 'Tarehe ya kuajiri' : 'Date hired', selected.hire],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="grid grid-cols-[130px_1fr] gap-2">
                      <span className="text-[#6c757d]">{l}</span>
                      <span className="border-b border-[#dee2e6] pb-0.5">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-sm">
                  {[
                    ['TIN', selected.tin],
                    [isSw ? 'Benki' : 'Bank', selected.bank],
                    [isSw ? 'Akaunti' : 'Account', selected.acct],
                    ['NSSF', isSw ? 'Ndiyo, imesajiliwa' : 'Yes, registered'],
                    [
                      'HESLB',
                      selected.heslb
                        ? isSw
                          ? 'Ndiyo, 15% ya jumla'
                          : 'Yes, 15% of gross'
                        : isSw
                          ? 'Hapana'
                          : 'No',
                    ],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="grid grid-cols-[130px_1fr] gap-2">
                      <span className="text-[#6c757d]">{l}</span>
                      <span className="border-b border-[#dee2e6] pb-0.5">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <h2 className="mx-5 mt-2 text-base font-medium">{isSw ? 'Muundo wa mshahara' : 'Monthly salary structure'}</h2>
            <div className="overflow-x-auto py-2">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    [isSw ? 'Mshahara wa msingi' : 'Basic salary', selected.basic],
                    [isSw ? 'Posho ya nyumba' : 'Housing allowance', selected.house],
                    [isSw ? 'Posho ya usafiri' : 'Transport allowance', selected.transport],
                  ].map(([l, v]) => (
                    <tr key={String(l)} className="border-b border-[#dee2e6]">
                      <td className="py-1.5 pl-5">{l}</td>
                      <td className="py-1.5 pr-5 text-right">{formatTzAmount(Number(v))}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[#6c757d] bg-[#f7f8fa] font-medium">
                    <td className="py-1.5 pl-5">{isSw ? 'Jumla ya mshahara' : 'Gross monthly salary'}</td>
                    <td className="py-1.5 pr-5 text-right">{formatTzAmount(selected.calc.gross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );

      case 'run':
        return (
          <>
            {sheetHead(
              `${isSw ? 'Mizunguko' : 'Payroll run'} — ${periodLabel}`,
              `${isSw ? 'Hali' : 'Status'}: ${statusLabel}`,
              <>
                <input
                  type="month"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="rounded border border-[#dee2e6] px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={busy || !canRun}
                  className="rounded border border-[#714b67] bg-[#714b67] px-3 py-1.5 text-white text-sm cursor-pointer disabled:opacity-50"
                  onClick={() => void runPayroll()}
                >
                  {isSw ? 'Thibitisha mishahara' : 'Confirm payroll run'}
                </button>
                <button
                  type="button"
                  disabled={busy || runStatus === 'draft' || !canPostAcct}
                  className="rounded border border-[#dee2e6] px-3 py-1.5 text-sm cursor-pointer disabled:opacity-50"
                  onClick={() => void postToAccounting()}
                >
                  {isSw ? 'Chapisha uhasibuni' : 'Post to accounting'}
                </button>
                <button type="button" className="rounded border border-[#dee2e6] px-3 py-1.5 text-sm cursor-pointer" onClick={exportBankFile}>
                  {isSw ? 'Pakua faili ya benki' : 'Export bank file'}
                </button>
                {onNavigateToAccounting ? (
                  <button
                    type="button"
                    className="rounded border border-[#017e84] text-[#017e84] px-3 py-1.5 text-sm cursor-pointer"
                    onClick={onNavigateToAccounting}
                  >
                    {isSw ? 'Fungua uhasibu' : 'Open accounting'}
                  </button>
                ) : null}
              </>,
            )}
            {kpis([
              { l: isSw ? 'Wanaolipwa' : 'Employees paid', v: String(employees.length) },
              { l: isSw ? 'Jumla ya mshahara' : 'Gross payroll', v: formatTzAmount(totals.tG) },
              {
                l: isSw ? 'Gharama ya mwajiri' : 'Total employer cost',
                v: formatTzAmount(totals.tCost),
                s: isSw ? 'Pamoja na NSSF, NHIF, SDL, WCF' : 'Includes employer NSSF, NHIF, SDL, WCF',
              },
              { l: isSw ? 'Watakapokea' : 'Net to employees', v: formatTzAmount(totals.tNet) },
            ])}
            <div className="overflow-x-auto py-2">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b-2 border-[#dee2e6] text-[#6c757d]">
                    <th className="py-2 pl-5 text-left font-medium">{isSw ? 'Mfanyakazi' : 'Employee'}</th>
                    <th className="px-2 text-right font-medium">{isSw ? 'Jumla' : 'Gross'}</th>
                    <th className="px-2 text-right font-medium">NSSF</th>
                    <th className="px-2 text-right font-medium">PAYE</th>
                    <th className="px-2 text-right font-medium">NHIF</th>
                    <th className="px-2 text-right font-medium">HESLB</th>
                    <th className="pr-5 text-right font-medium">{isSw ? 'Halisi' : 'Net pay'}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr
                      key={e.id}
                      className="cursor-pointer border-b border-[#dee2e6] hover:bg-[#f3f0f2]"
                      onClick={() => {
                        setEmpId(e.id);
                        setView('payslip');
                      }}
                    >
                      <td className="py-1.5 pl-5">{e.name}</td>
                      <td className="px-2 text-right">{formatTzAmount(e.calc.gross)}</td>
                      <td className="px-2 text-right">{formatTzAmount(e.calc.nssfE)}</td>
                      <td className="px-2 text-right">{formatTzAmount(e.calc.paye)}</td>
                      <td className="px-2 text-right">{formatTzAmount(e.calc.nhifE)}</td>
                      <td className="px-2 text-right">{formatTzAmount(e.calc.hes)}</td>
                      <td className="pr-5 text-right">{formatTzAmount(e.calc.net)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-[#6c757d] bg-[#f7f8fa] font-medium">
                    <td className="py-1.5 pl-5">{isSw ? 'Jumla' : 'Total'}</td>
                    <td className="px-2 text-right">{formatTzAmount(totals.tG)}</td>
                    <td className="px-2 text-right">{formatTzAmount(totals.tNssfE)}</td>
                    <td className="px-2 text-right">{formatTzAmount(totals.tPaye)}</td>
                    <td className="px-2 text-right">{formatTzAmount(totals.tNhifE)}</td>
                    <td className="px-2 text-right">{formatTzAmount(totals.tHes)}</td>
                    <td className="pr-5 text-right">{formatTzAmount(totals.tNet)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );

      case 'payslip':
        if (!selected) return null;
        return (
          <>
            {sheetHead(
              `${isSw ? 'Slip ya mshahara' : 'Payslip'} — ${periodLabel}`,
              undefined,
              <>
                <select
                  className="rounded border border-[#dee2e6] px-2 py-1.5 text-sm"
                  value={selected.id}
                  onChange={ev => setEmpId(ev.target.value)}
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                {canSign ? (
                  <button
                    type="button"
                    className="rounded border border-[#0f3d3e] text-[#0f3d3e] px-3 py-1.5 text-sm cursor-pointer"
                    onClick={() => setSignatureOpen(true)}
                  >
                    {isSw ? 'Saini ya HR' : 'HR signature'}
                  </button>
                ) : null}
                <button type="button" className="rounded border border-[#dee2e6] px-3 py-1.5 text-sm cursor-pointer" onClick={printPayslip}>
                  {isSw ? 'Chapisha slip' : 'Print payslip'}
                </button>
              </>,
            )}
            <div className="mx-5 my-4 pb-6">
              {payslipModel ? <TanzaniaPayslipView model={payslipModel} /> : null}
            </div>
          </>
        );

      case 'paye':
        return (
          <>
            {sheetHead(
              `TRA PAYE — ${periodLabel}`,
              isSw ? 'Kodi ya ajira — TRA' : 'Employment tax return — Tanzania Revenue Authority',
              <button type="button" className="rounded bg-[#714b67] px-3 py-1.5 text-white text-sm cursor-pointer" onClick={exportPayeCsv}>
                {isSw ? 'Pakua ratiba' : 'Generate e-filing schedule'}
              </button>,
            )}
            {kpis([
              { l: 'PAYE', v: `${formatTzAmount(totals.tPaye)} TZS` },
              {
                l: isSw ? 'Waliotozwa' : 'Employees taxed',
                v: `${employees.filter(e => e.calc.paye > 0).length} / ${employees.length}`,
              },
              { l: isSw ? 'Tarehe ya mwisho' : 'Due date', v: isSw ? 'Tarehe 7 mwezi ujao' : '7th of next month' },
            ])}
            <StatutoryTable
              headers={[isSw ? 'Mfanyakazi' : 'Employee', 'TIN', isSw ? 'Jumla' : 'Gross', 'NSSF', isSw ? 'Inayotozwa' : 'Taxable', 'PAYE']}
              rows={employees.map(e => [
                e.name,
                e.tin,
                formatTzAmount(e.calc.gross),
                `(${formatTzAmount(e.calc.nssfE)})`,
                formatTzAmount(e.calc.taxable),
                formatTzAmount(e.calc.paye),
              ])}
              totalRow={[isSw ? 'Jumla PAYE' : 'Total PAYE', '', '', '', '', formatTzAmount(totals.tPaye)]}
            />
          </>
        );

      case 'nssf':
        return (
          <>
            {sheetHead(`NSSF — ${periodLabel}`, isSw ? 'Mfuko wa hifadhi ya jamii' : 'National Social Security Fund')}
            {kpis([
              { l: isSw ? 'Mfanyakazi 10%' : 'Employee 10%', v: formatTzAmount(totals.tNssfE) },
              { l: isSw ? 'Mwajiri 10%' : 'Employer 10%', v: formatTzAmount(totals.tNssfR) },
              { l: isSw ? 'Jumla 20%' : 'Total 20%', v: formatTzAmount(totals.tNssfE + totals.tNssfR) },
            ])}
            <StatutoryTable
              headers={[isSw ? 'Mfanyakazi' : 'Employee', isSw ? 'Jumla' : 'Gross', '10%', '10% (E)', isSw ? 'Jumla' : 'Total']}
              rows={employees.map(e => [
                e.name,
                formatTzAmount(e.calc.gross),
                formatTzAmount(e.calc.nssfE),
                formatTzAmount(e.calc.nssfR),
                formatTzAmount(e.calc.nssfE + e.calc.nssfR),
              ])}
            />
          </>
        );

      case 'sdlwcf':
        return (
          <>
            {sheetHead(
              isSw ? 'SDL na WCF' : 'SDL and WCF',
              isSw ? 'Gharama za mwajiri tu' : 'Employer-only costs',
            )}
            {kpis([
              {
                l: 'SDL 3.5%',
                v: formatTzAmount(totals.tSdl),
                s:
                  headcount >= TZ_PAYROLL_RATES.sdlHeadcountThreshold
                    ? isSw
                      ? 'Inatumika (wafanyakazi 10+)'
                      : 'Applies (10+ employees)'
                    : isSw
                      ? 'Haitumiki'
                      : 'Not applicable',
              },
              { l: 'WCF 0.5%', v: formatTzAmount(totals.tWcf) },
              { l: isSw ? 'Jumla' : 'Total', v: formatTzAmount(totals.tSdl + totals.tWcf) },
            ])}
            <StatutoryTable
              headers={[isSw ? 'Mfanyakazi' : 'Employee', isSw ? 'Jumla' : 'Gross', 'SDL', 'WCF']}
              rows={employees.map(e => [e.name, formatTzAmount(e.calc.gross), formatTzAmount(e.calc.sdl), formatTzAmount(e.calc.wcf)])}
            />
          </>
        );

      case 'heslb':
        return (
          <>
            {sheetHead(`HESLB — ${periodLabel}`, isSw ? 'Bodi ya mikopo ya elimu' : 'Higher Education Students\' Loans Board')}
            {kpis([
              {
                l: isSw ? 'Wanufaika' : 'Beneficiaries',
                v: `${employees.filter(e => e.heslb).length} / ${employees.length}`,
              },
              { l: isSw ? 'Kiwango' : 'Rate', v: '15% ' + (isSw ? 'ya jumla' : 'of gross') },
              { l: isSw ? 'Jumla ya kulipa' : 'Total to remit', v: formatTzAmount(totals.tHes) },
            ])}
            <StatutoryTable
              headers={[isSw ? 'Mfanyakazi' : 'Employee', 'TIN', isSw ? 'Jumla' : 'Gross', 'HESLB']}
              rows={employees.filter(e => e.heslb).map(e => [e.name, e.tin, formatTzAmount(e.calc.gross), formatTzAmount(e.calc.hes)])}
              emptyMessage={isSw ? 'Hakuna wanufaika wa mkopo.' : 'No loan beneficiaries flagged.'}
            />
          </>
        );

      case 'nhif':
        return (
          <>
            {sheetHead(
              isSw ? 'NHIF / Bima ya afya' : 'NHIF / Universal Health Insurance',
              isSw ? 'Lazima kwa sekta rasmi tangu Jan 2026' : 'Mandatory formal sector cover from Jan 2026',
            )}
            {kpis([
              { l: isSw ? 'Mfanyakazi 3%' : 'Employee 3%', v: formatTzAmount(totals.tNhifE) },
              { l: isSw ? 'Mwajiri 3%' : 'Employer 3%', v: formatTzAmount(totals.tNhifR) },
              { l: isSw ? 'Jumla 6%' : 'Total 6%', v: formatTzAmount(totals.tNhifE + totals.tNhifR) },
            ])}
            <StatutoryTable
              headers={[isSw ? 'Mfanyakazi' : 'Employee', isSw ? 'Mshahara msingi' : 'Basic', '3%', '3% (E)', isSw ? 'Jumla' : 'Total']}
              rows={employees.map(e => [
                e.name,
                formatTzAmount(e.basic),
                formatTzAmount(e.calc.nhifE),
                formatTzAmount(e.calc.nhifR),
                formatTzAmount(e.calc.nhifE + e.calc.nhifR),
              ])}
            />
          </>
        );

      case 'rates':
        return (
          <>
            {sheetHead(
              isSw ? 'Viwango vya kisheria' : 'Statutory rates configuration',
              isSw ? 'Tanzania Bara — thibitisha kabla ya kulipa' : 'Mainland Tanzania — verify before live payroll',
            )}
            <RatesTable isSw={isSw} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <EnterpriseWorkspaceShell
        moduleLabel={isSw ? 'Mishahara' : 'Payroll'}
        companyLine={[businessName, branchName, isSw ? 'Tanzania' : 'Tanzania'].filter(Boolean).join(', ')}
        breadcrumbPrefix={isSw ? 'Mishahara' : 'Payroll'}
        breadcrumbCurrent={railLabel(view)}
        topNav={[
          {
            id: 'employees',
            label: isSw ? 'Wafanyakazi' : 'Employees',
            active: false,
            onClick: () => setView('employees'),
          },
          {
            id: 'payroll',
            label: isSw ? 'Mishahara' : 'Payroll',
            active: true,
            onClick: () => setView('run'),
          },
        ]}
        rail={RAIL.map(r => ({
          id: r.id,
          group: r.group,
          label: isSw ? r.nameSw : r.nameEn,
        }))}
        activeRailId={view}
        onRailSelect={id => setView(id as PayrollViewId)}
      >
        {renderSheet()}
      </EnterpriseWorkspaceShell>

      {contractEditOpen && selected ? (
        <ContractEditModal
          isSw={isSw}
          employee={selected}
          onClose={() => setContractEditOpen(false)}
          onSave={persistContract}
        />
      ) : null}

      <DigitalSignatureModal
        open={signatureOpen}
        language={isSw ? 'sw' : 'en'}
        onClose={() => setSignatureOpen(false)}
        onSave={saveEmployerSignature}
        subtitle={
          isSw
            ? 'Inahitajika mara ya kwanza kabla ya kuchapisha slip rasmi.'
            : 'Required once before issuing official printed payslips.'
        }
      />
    </>
  );
};

function StatutoryTable({
  headers,
  rows,
  totalRow,
  emptyMessage,
}: {
  headers: string[];
  rows: string[][];
  totalRow?: string[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto py-2">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b-2 border-[#dee2e6] text-[#6c757d]">
            {headers.map(h => (
              <th key={h} className="py-2 px-2 text-left font-medium first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyMessage ? (
            <tr>
              <td colSpan={headers.length} className="px-5 py-6 text-[#6c757d]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-[#dee2e6] hover:bg-[#f3f0f2]">
                {row.map((cell, j) => (
                  <td key={j} className={`py-1.5 px-2 ${j > 0 ? 'text-right whitespace-nowrap' : 'pl-5'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
          {totalRow ? (
            <tr className="border-t border-[#6c757d] bg-[#f7f8fa] font-medium">
              {totalRow.map((cell, j) => (
                <td key={j} className={`py-1.5 px-2 ${j > 0 ? 'text-right' : 'pl-5'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function RatesTable({ isSw }: { isSw: boolean }) {
  const rows: [string, string, string][] = [
    ['PAYE band 1', '0%', isSw ? 'Hadi TZS 270,000/mwezi' : 'Up to TZS 270,000/month'],
    ['PAYE band 2', '8%', '270,001 – 520,000'],
    ['PAYE band 3', '20%', '520,001 – 760,000'],
    ['PAYE band 4', '25%', '760,001 – 1,000,000'],
    ['PAYE band 5', '30%', isSw ? 'Zaidi ya 1,000,000' : 'Above 1,000,000'],
    ['NSSF', '10% + 10%', isSw ? 'Jumla 20% ya mshahara wa jumla' : '20% of gross, split employee/employer'],
    ['NHIF / UHI', '3% + 3%', isSw ? 'Kwenye mshahara wa msingi' : 'On basic salary'],
    ['SDL', '3.5%', isSw ? 'Mwajiri, wafanyakazi 10+' : 'Employer, 10+ staff'],
    ['WCF', '0.5%', isSw ? 'Mwajiri, haiwezi kukatwa kwa mfanyakazi' : 'Employer only'],
    ['HESLB', '15%', isSw ? 'Wanufaika wa mkopo tu' : 'Loan beneficiaries only'],
  ];
  return (
    <div className="overflow-x-auto py-2 px-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-[#dee2e6] text-[#6c757d]">
            <th className="py-2 pl-5 text-left font-medium">{isSw ? 'Kipengele' : 'Item'}</th>
            <th className="px-2 text-left font-medium">{isSw ? 'Kiwango' : 'Rate'}</th>
            <th className="pr-5 text-left font-medium">{isSw ? 'Maelezo' : 'Notes'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r[0]} className="border-b border-[#dee2e6]">
              <td className="py-1.5 pl-5">{r[0]}</td>
              <td className="px-2">{r[1]}</td>
              <td className="pr-5 text-[#6c757d]">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 pb-4 text-xs text-[#6c757d]">
        {isSw
          ? 'Viwango hubadilika na Finance Act (kawaida Julai). Thibitisha kwenye tovuti rasmi za TRA, NSSF, NHIF, HESLB na WCF.'
          : 'Rates change with each Finance Act (usually July). Confirm at tra.go.tz, nssf.go.tz, nhif.or.tz, heslb.go.tz and wcf.go.tz.'}
      </p>
    </div>
  );
}

function ContractEditModal({
  isSw,
  employee,
  onClose,
  onSave,
}: {
  isSw: boolean;
  employee: PayrollEmployeeRow;
  onClose: () => void;
  onSave: (d: Partial<PayrollEmployeeRow> & { id: string; name?: string }) => void;
}) {
  const [draft, setDraft] = useState({ ...employee });
  const fields: Array<[keyof PayrollEmployeeRow, string, string]> = [
    ['basic', isSw ? 'Mshahara wa msingi' : 'Basic salary', 'number'],
    ['house', isSw ? 'Posho ya nyumba' : 'Housing allowance', 'number'],
    ['transport', isSw ? 'Posho ya usafiri' : 'Transport allowance', 'number'],
    ['dept', isSw ? 'Idara' : 'Department', 'text'],
    ['title', isSw ? 'Cheo' : 'Job title', 'text'],
    ['tin', 'TIN', 'text'],
    ['nssfNo', 'NSSF no.', 'text'],
    ['bank', isSw ? 'Benki' : 'Bank', 'text'],
    ['bankBranch', isSw ? 'Tawi la benki' : 'Bank branch', 'text'],
    ['acct', isSw ? 'Akaunti' : 'Account', 'text'],
    ['hire', isSw ? 'Tarehe ya kuajiri' : 'Hire date', 'date'],
    ['type', isSw ? 'Aina ya mkataba' : 'Contract type', 'text'],
  ];
  return (
    <ModalPortal open onClose={onClose} zClassName="z-[320]">
      <form
        className="w-full max-w-lg rounded-xl border border-[#dee2e6] bg-white p-5 shadow-xl text-sm space-y-3 max-h-[min(92vh,880px)] overflow-y-auto"
        onSubmit={e => {
          e.preventDefault();
          onSave({ ...draft, id: employee.id, name: employee.name });
        }}
      >
        <h3 className="text-base font-medium sticky top-0 bg-white pb-2 border-b border-[#dee2e6]">
          {isSw ? 'Hariri mkataba' : 'Edit contract & pay structure'}
        </h3>
        <p className="text-xs text-[#6c757d]">{employee.name}</p>
        {fields.map(([key, label, type]) => (
          <label key={String(key)} className="block space-y-1">
            <span className="text-xs text-[#6c757d]">{label}</span>
            <input
              type={type}
              className="w-full rounded border border-[#dee2e6] px-3 py-2 font-mono text-sm"
              value={String(draft[key] ?? '')}
              onChange={ev => {
                const v = type === 'number' ? Number(ev.target.value) || 0 : ev.target.value;
                setDraft(prev => ({ ...prev, [key]: v }));
              }}
            />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.heslb}
            onChange={ev => setDraft(prev => ({ ...prev, heslb: ev.target.checked }))}
          />
          HESLB {isSw ? 'mwanufaika wa mkopo' : 'loan beneficiary'}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="rounded border px-3 py-2 cursor-pointer" onClick={onClose}>
            {isSw ? 'Ghairi' : 'Cancel'}
          </button>
          <button type="submit" className="rounded bg-[#714b67] px-4 py-2 text-white cursor-pointer">
            {isSw ? 'Hifadhi' : 'Save'}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
}

export default PayrollTanzaniaHub;
