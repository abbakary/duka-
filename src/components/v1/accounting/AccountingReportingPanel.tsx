import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import type { Customer, ExpenseItem, Language, Product, PurchaseOrder, SaleTransaction } from '@/types/v1';
import { formatTSh } from '@/utils/translations';
import {
  buildAgedPayables,
  buildAgedReceivablesFromSales,
  buildBalanceSheet,
  buildIncomeStatement,
  buildWeeklyActivity,
  type AccountingBooksMode,
} from '@/lib/accountingDerivedReports';
import type { AccountingReportBundle } from '@/lib/accountingApiTypes';

export type AccountingReportId =
  | 'income'
  | 'balance'
  | 'cashflow'
  | 'trial'
  | 'ledger'
  | 'aged-rec'
  | 'aged-pay';

interface TrialRow {
  code: string;
  name: string;
  debit: number;
  credit: number;
}

interface AccountingReportingPanelProps {
  language: Language;
  businessName: string;
  branchName?: string;
  sales: SaleTransaction[];
  products: Product[];
  customers: Customer[];
  expenses: ExpenseItem[];
  purchaseOrders: PurchaseOrder[];
  booksMode: AccountingBooksMode;
  trialRows: TrialRow[];
  reportBundle?: AccountingReportBundle | null;
  initialReport?: AccountingReportId;
}

const REPORT_META: Record<
  AccountingReportId,
  { titleEn: string; titleSw: string; subEn: string; subSw: string; crumb: string }
> = {
  income: {
    titleEn: 'Income statement',
    titleSw: 'Taarifa ya mapato',
    subEn: 'Profit & loss from posted activity and operational data',
    subSw: 'Faida na hasara kutoka shughuli zilizorekodiwa',
    crumb: 'Accounting / Reporting / Income',
  },
  balance: {
    titleEn: 'Balance sheet',
    titleSw: 'Mizania',
    subEn: 'Assets, liabilities, and equity snapshot',
    subSw: 'Mali, deni, na mtaji',
    crumb: 'Accounting / Reporting / Balance sheet',
  },
  cashflow: {
    titleEn: 'Cash flow statement',
    titleSw: 'Mtiririko wa fedha',
    subEn: 'Operating, investing, and financing cash (derived)',
    subSw: 'Fedha za uendeshaji, uwekezaji, na ufadhili',
    crumb: 'Accounting / Reporting / Cash flow',
  },
  trial: {
    titleEn: 'Trial balance',
    titleSw: 'Mizani ya majaribio',
    subEn: 'Debit and credit totals by account',
    subSw: 'Jumla ya deni na mkopo kwa kila akaunti',
    crumb: 'Accounting / Reporting / Trial balance',
  },
  ledger: {
    titleEn: 'General ledger',
    titleSw: 'Leja kuu',
    subEn: 'Account detail from journal entries',
    subSw: 'Maelezo ya akaunti kutoka vitabu',
    crumb: 'Accounting / Reporting / General ledger',
  },
  'aged-rec': {
    titleEn: 'Aged receivables',
    titleSw: 'Madeni ya wateja',
    subEn: 'Customer balances by age bucket',
    subSw: 'Salio la wateja kwa umri',
    crumb: 'Accounting / Reporting / Aged receivables',
  },
  'aged-pay': {
    titleEn: 'Aged payables',
    titleSw: 'Madeni ya wasambazaji',
    subEn: 'Vendor balances by age bucket',
    subSw: 'Salio la wasambazaji kwa umri',
    crumb: 'Accounting / Reporting / Aged payables',
  },
};

const NAV: { id: AccountingReportId; en: string; sw: string; groupEn: string; groupSw: string }[] = [
  { id: 'income', en: 'Income statement', sw: 'Mapato', groupEn: 'Financial statements', groupSw: 'Taarifa za kifedha' },
  { id: 'balance', en: 'Balance sheet', sw: 'Mizania', groupEn: 'Financial statements', groupSw: 'Taarifa za kifedha' },
  { id: 'cashflow', en: 'Cash flow', sw: 'Mtiririko wa fedha', groupEn: 'Financial statements', groupSw: 'Taarifa za kifedha' },
  { id: 'trial', en: 'Trial balance', sw: 'Mizani ya majaribio', groupEn: 'Audit & ledgers', groupSw: 'Ukaguzi & leja' },
  { id: 'ledger', en: 'General ledger', sw: 'Leja kuu', groupEn: 'Audit & ledgers', groupSw: 'Ukaguzi & leja' },
  { id: 'aged-rec', en: 'Aged receivables', sw: 'Madeni wateja', groupEn: 'Aging', groupSw: 'Umri wa deni' },
  { id: 'aged-pay', en: 'Aged payables', sw: 'Madeni wasambazaji', groupEn: 'Aging', groupSw: 'Umri wa deni' },
];

function numCell(n: number, negative = false) {
  if (!n) return '–';
  const s = formatTSh(Math.abs(n));
  return negative && n > 0 ? `(${s})` : s;
}

export const AccountingReportingPanel: React.FC<AccountingReportingPanelProps> = ({
  language,
  businessName,
  branchName,
  sales,
  products,
  customers,
  expenses,
  purchaseOrders,
  booksMode,
  trialRows,
  reportBundle,
  initialReport = 'income',
}) => {
  const isSw = language === 'sw';
  const [reportId, setReportId] = useState<AccountingReportId>(initialReport);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReportId(initialReport);
  }, [initialReport]);

  const income = useMemo(() => {
    if (reportBundle?.income_statement) {
      const s = reportBundle.income_statement;
      return {
        revenue: s.revenue,
        cogs: s.cogs,
        grossProfit: s.gross_profit,
        operatingExpenses: s.operating_expenses,
        vatOutput: s.vat_output,
        netBeforeTax: s.net_before_tax,
        lines: s.lines.map(l => ({
          key: l.key,
          labelEn: l.label_en,
          labelSw: l.label_sw,
          amount: l.amount,
          section: l.section,
        })),
      };
    }
    return buildIncomeStatement(sales, products, expenses, booksMode);
  }, [reportBundle, sales, products, expenses, booksMode]);

  const balance = useMemo(() => {
    if (reportBundle?.balance_sheet) {
      const b = reportBundle.balance_sheet;
      return {
        cash: b.cash,
        receivables: b.receivables,
        inventory: b.inventory,
        payables: b.payables,
        vatPayable: b.vat_payable,
        equityEstimate: b.equity_estimate,
        totalAssets: b.total_assets,
        totalLiabilities: b.total_liabilities,
      };
    }
    const localIncome = buildIncomeStatement(sales, products, expenses, booksMode);
    return buildBalanceSheet(
      sales,
      products,
      customers,
      purchaseOrders,
      booksMode,
      localIncome.netBeforeTax,
    );
  }, [reportBundle, sales, products, customers, purchaseOrders, expenses, booksMode]);

  const agedRec = useMemo(() => {
    if (reportBundle) {
      return (reportBundle.aged_receivables || []).map(r => ({
        ...r,
        flag: r.flag === 'overdue' ? ('overdue' as const) : r.flag === 'due_soon' ? ('due_soon' as const) : undefined,
      }));
    }
    return buildAgedReceivablesFromSales(sales, customers);
  }, [reportBundle, customers, sales]);

  const agedPay = useMemo(() => {
    if (reportBundle) {
      return (reportBundle.aged_payables || []).map(r => ({
        ...r,
        flag: r.flag === 'overdue' ? ('overdue' as const) : r.flag === 'due_soon' ? ('due_soon' as const) : undefined,
      }));
    }
    return buildAgedPayables(purchaseOrders);
  }, [reportBundle, purchaseOrders]);

  const weekly = useMemo(() => {
    if (reportBundle?.weekly_activity?.length) return reportBundle.weekly_activity;
    return buildWeeklyActivity(sales, purchaseOrders);
  }, [reportBundle, sales, purchaseOrders]);

  const apiTrialRows = useMemo(
    () =>
      reportBundle?.trial_balance?.rows?.map(r => ({
        code: r.code,
        name: r.name,
        debit: r.debit,
        credit: r.credit,
      })) ?? trialRows,
    [reportBundle, trialRows],
  );

  const ledgerRows = reportBundle?.general_ledger ?? [];

  const meta = REPORT_META[reportId];
  const title = isSw ? meta.titleSw : meta.titleEn;
  const subtitle = isSw ? meta.subSw : meta.subEn;

  const trialDebit = apiTrialRows.reduce((a, r) => a + r.debit, 0);
  const trialCredit = apiTrialRows.reduce((a, r) => a + r.credit, 0);

  const exportPrint = () => {
    window.print();
  };

  const groups = [...new Set(NAV.map(n => (isSw ? n.groupSw : n.groupEn)))];

  return (
    <div className="min-h-[640px] rounded-xl border border-[#d4e8dc] overflow-hidden bg-[#f5faf7] shadow-sm flex flex-col">
      <div className="bg-white border-b border-[#d4e8dc] px-4 sm:px-5 py-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1a3d2e] truncate">{businessName}</p>
            {branchName && <p className="text-xs text-[#5a7a68] truncate">{branchName}</p>}
          </div>
          <p className="text-[10px] uppercase tracking-wide text-[#5a7a68]">
            {isSw ? 'TZS · data kutoka API' : 'TZS · API-backed figures'}
          </p>
        </div>
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5a7a68] mb-1.5">{g}</p>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={g}>
                {NAV.filter(n => (isSw ? n.groupSw : n.groupEn) === g).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={reportId === item.id}
                    onClick={() => setReportId(item.id)}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold cursor-pointer transition-colors ${
                      reportId === item.id
                        ? 'bg-[#107C10] text-white shadow-sm'
                        : 'bg-[#eef5f0] text-[#1a3d2e] hover:bg-[#e0f0e6] border border-[#d4e8dc]'
                    }`}
                  >
                    {isSw ? item.sw : item.en}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-[#f5faf7]">
        <header className="bg-white border-b border-[#d4e8dc] px-4 sm:px-6 py-4 sticky top-0 z-10 print:hidden">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#1a3d2e]">{title}</h2>
              <p className="text-sm text-[#5a7a68] mt-0.5">{subtitle}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportPrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#d4e8dc] bg-white text-sm font-semibold text-[#1a3d2e] cursor-pointer hover:border-[#107C10]"
              >
                <Printer className="w-4 h-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => alert(isSw ? 'Excel export inapojengwa' : 'Excel export coming soon')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#107C10] text-white text-sm font-bold cursor-pointer hover:bg-[#0E6A0E]"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs px-3 py-1 rounded-full bg-[#e7f5ec] border border-[#d4e8dc] text-[#1a3d2e]">
              {isSw ? 'Kampuni' : 'Company'} <b>{businessName}</b>
            </span>
            {branchName && (
              <span className="text-xs px-3 py-1 rounded-full bg-[#e7f5ec] border border-[#d4e8dc]">
                {isSw ? 'Tawi' : 'Branch'} <b>{branchName}</b>
              </span>
            )}
            <span className="text-xs px-3 py-1 rounded-full bg-[#e7f5ec] border border-[#d4e8dc]">
              {isSw ? 'Vitabu' : 'Books'}{' '}
              <b>{booksMode === 'tra' ? 'TRA / VAT' : isSw ? 'Kawaida' : 'Standard'}</b>
            </span>
          </div>
        </header>

        <div ref={printRef} className="flex-1 p-4 sm:p-6 space-y-4 overflow-auto">
          {reportId === 'income' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { l: isSw ? 'Mapato' : 'Revenue', v: income.revenue },
                  { l: isSw ? 'Faida jumla' : 'Gross profit', v: income.grossProfit },
                  { l: isSw ? 'Matumizi' : 'Op. expenses', v: income.operatingExpenses },
                  { l: isSw ? 'Matokeo' : 'Net result', v: income.netBeforeTax },
                ].map(k => (
                  <div key={k.l} className="bg-white border border-[#d4e8dc] rounded-md p-3">
                    <p className="text-xs text-[#5a7a68]">{k.l}</p>
                    <p className="text-lg font-bold font-mono text-[#1a3d2e] mt-1">{formatTSh(k.v)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-[#d4e8dc] rounded-md p-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7f5ec" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatTSh(v)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#107C10" name={isSw ? 'Mauzo' : 'Revenue'} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="bills" stroke="#2d6a4f" name={isSw ? 'Manunuzi' : 'Purchases'} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white border border-[#d4e8dc] rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#e7f5ec] text-[#3d5c4a] text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">{isSw ? 'Akaunti' : 'Account'}</th>
                      <th className="text-right px-4 py-2">TZS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {income.lines.map(line => (
                      <tr
                        key={line.key}
                        className={
                          line.section === 'total'
                            ? 'border-t-2 border-[#1a3d2e] font-bold'
                            : line.section === 'subtotal'
                              ? 'border-t border-[#5a7a68] font-semibold bg-[#f5faf7]'
                              : 'border-t border-[#eef5f0]'
                        }
                      >
                        <td className="px-4 py-2">{isSw ? line.labelSw : line.labelEn}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{formatTSh(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {reportId === 'balance' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border border-[#d4e8dc] rounded-md overflow-hidden">
                <h3 className="px-4 py-3 font-bold text-[#1a3d2e] border-b border-[#e7f5ec]">{isSw ? 'Mali' : 'Assets'}</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      [isSw ? 'Fedha / benki' : 'Cash & bank', balance.cash],
                      [isSw ? 'Madeni ya wateja' : 'Receivables', balance.receivables],
                      [isSw ? 'Stoo' : 'Inventory', balance.inventory],
                    ].map(([l, v]) => (
                      <tr key={String(l)} className="border-t border-[#eef5f0]">
                        <td className="px-4 py-2">{l}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatTSh(Number(v))}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#1a3d2e] font-bold">
                      <td className="px-4 py-2">{isSw ? 'Jumla mali' : 'Total assets'}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatTSh(balance.totalAssets)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-white border border-[#d4e8dc] rounded-md overflow-hidden">
                <h3 className="px-4 py-3 font-bold border-b border-[#e7f5ec]">{isSw ? 'Deni & mtaji' : 'Liabilities & equity'}</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      [isSw ? 'Madeni wasambazaji' : 'Payables', balance.payables],
                      ...(booksMode === 'tra'
                        ? [[isSw ? 'VAT inayodaiwa TRA' : 'VAT payable (TRA)', balance.vatPayable] as const]
                        : []),
                      [isSw ? 'Mtaji (makadirio)' : 'Equity (est.)', balance.equityEstimate],
                    ].map(([l, v]) => (
                      <tr key={String(l)} className="border-t border-[#eef5f0]">
                        <td className="px-4 py-2">{l}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatTSh(Number(v))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportId === 'cashflow' && (
            <div className="bg-white border border-[#d4e8dc] rounded-md p-4 space-y-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekly}>
                    <defs>
                      <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#107C10" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#107C10" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7f5ec" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => formatTSh(v)} />
                    <Area type="monotone" dataKey="revenue" stroke="#107C10" fill="url(#cashGrad)" name={isSw ? 'Uendeshaji' : 'Operating'} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="font-bold bg-[#f5faf7]">
                    <td className="px-3 py-2">{isSw ? 'Shughuli za uendeshaji' : 'Operating activities'}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatTSh(income.netBeforeTax)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 pl-6">{isSw ? 'Manunuzi (makadirio)' : 'Purchases (est.)'}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-700">
                      ({formatTSh(purchaseOrders.reduce((a, p) => a + (p.totalAmount || 0), 0) * 0.15)})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {reportId === 'trial' && (
            <div className="bg-white border border-[#d4e8dc] rounded-md overflow-x-auto">
              <p className="text-xs text-[#5a7a68] px-4 py-2 border-b border-[#e7f5ec]">
                {isSw ? 'Jumla deni = mkopo:' : 'Debit total = credit total:'}{' '}
                <b className="font-mono">{formatTSh(trialDebit)}</b>
              </p>
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-[#e7f5ec] text-xs uppercase text-[#3d5c4a]">
                  <tr>
                    <th className="text-left px-4 py-2">{isSw ? 'Nambari' : 'Code'}</th>
                    <th className="text-left px-4 py-2">{isSw ? 'Akaunti' : 'Account'}</th>
                    <th className="text-right px-4 py-2">{isSw ? 'Deni' : 'Debit'}</th>
                    <th className="text-right px-4 py-2">{isSw ? 'Mkopo' : 'Credit'}</th>
                  </tr>
                </thead>
                <tbody>
                  {apiTrialRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#5a7a68]">
                        {isSw ? 'Chapisha ingizo la shuaraba kwanza.' : 'Post a journal entry to populate the trial balance.'}
                      </td>
                    </tr>
                  ) : (
                    apiTrialRows.map(r => (
                      <tr key={r.code} className="border-t border-[#eef5f0]">
                        <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2 text-right font-mono">{numCell(r.debit)}</td>
                        <td className="px-4 py-2 text-right font-mono">{numCell(r.credit)}</td>
                      </tr>
                    ))
                  )}
                  {apiTrialRows.length > 0 && (
                    <tr className="border-t-2 border-[#1a3d2e] font-bold">
                      <td colSpan={2} className="px-4 py-2">
                        {isSw ? 'Jumla' : 'Total'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{formatTSh(trialDebit)}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatTSh(trialCredit)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportId === 'ledger' && (
            <div className="bg-white border border-[#d4e8dc] rounded-md overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-[#e7f5ec] text-xs uppercase text-[#3d5c4a]">
                  <tr>
                    <th className="text-left px-3 py-2">{isSw ? 'Tarehe' : 'Date'}</th>
                    <th className="text-left px-3 py-2">{isSw ? 'Rejea' : 'Reference'}</th>
                    <th className="text-left px-3 py-2">{isSw ? 'Akaunti' : 'Account'}</th>
                    <th className="text-left px-3 py-2">{isSw ? 'Maelezo' : 'Label'}</th>
                    <th className="text-right px-2 py-2">{isSw ? 'Deni' : 'Debit'}</th>
                    <th className="text-right px-2 py-2">{isSw ? 'Mkopo' : 'Credit'}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#5a7a68]">
                        {isSw ? 'Hakuna mistari ya leja bado.' : 'No ledger lines yet — post sales or journal entries.'}
                      </td>
                    </tr>
                  ) : (
                    ledgerRows.map((row, idx) => (
                      <tr key={`${row.reference}-${idx}`} className="border-t border-[#eef5f0]">
                        <td className="px-3 py-2 whitespace-nowrap">{row.entry_date.slice(0, 10)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.reference}</td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs mr-1">{row.account_code}</span>
                          {row.account_name}
                        </td>
                        <td className="px-3 py-2 text-[#5a7a68]">{row.label}</td>
                        <td className="px-2 py-2 text-right font-mono">{numCell(row.debit)}</td>
                        <td className="px-2 py-2 text-right font-mono">{numCell(row.credit)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportId === 'aged-rec' && (
            <AgingTable rows={agedRec} isSw={isSw} type="rec" />
          )}

          {reportId === 'aged-pay' && (
            <AgingTable rows={agedPay} isSw={isSw} type="pay" />
          )}
        </div>
      </div>
    </div>
  );
};

function AgingTable({
  rows,
  isSw,
  type,
}: {
  rows: ReturnType<typeof buildAgedReceivables>;
  isSw: boolean;
  type: 'rec' | 'pay';
}) {
  const totals = rows.reduce(
    (a, r) => ({
      current: a.current + r.current,
      d30: a.d30 + r.d30,
      d60: a.d60 + r.d60,
      d90: a.d90 + r.d90,
      d90plus: a.d90plus + r.d90plus,
      total: a.total + r.total,
    }),
    { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 },
  );

  return (
    <div className="bg-white border border-[#d4e8dc] rounded-md overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-[#e7f5ec] text-xs uppercase text-[#3d5c4a]">
          <tr>
            <th className="text-left px-3 py-2">{type === 'rec' ? (isSw ? 'Mteja' : 'Customer') : isSw ? 'Msambazaji' : 'Vendor'}</th>
            <th className="text-right px-2 py-2">{isSw ? 'Haijaisha' : 'Not due'}</th>
            <th className="text-right px-2 py-2">1–30</th>
            <th className="text-right px-2 py-2">31–60</th>
            <th className="text-right px-2 py-2">61–90</th>
            <th className="text-right px-2 py-2">90+</th>
            <th className="text-right px-3 py-2">{isSw ? 'Jumla' : 'Total'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-[#5a7a68]">
                {isSw ? 'Hakuna salio.' : 'No outstanding balances.'}
              </td>
            </tr>
          ) : (
            rows.map(r => (
              <tr key={r.name} className="border-t border-[#eef5f0]">
                <td className="px-3 py-2">
                  {r.name}
                  {r.flag === 'overdue' && (
                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      {isSw ? 'Imechelewa' : 'Overdue'}
                    </span>
                  )}
                  {r.flag === 'due_soon' && (
                    <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      {isSw ? 'Inakaribia' : 'Due soon'}
                    </span>
                  )}
                </td>
                <td className="text-right px-2 py-2 font-mono text-xs">{numCell(r.current)}</td>
                <td className="text-right px-2 py-2 font-mono text-xs">{numCell(r.d30)}</td>
                <td className="text-right px-2 py-2 font-mono text-xs">{numCell(r.d60)}</td>
                <td className="text-right px-2 py-2 font-mono text-xs">{numCell(r.d90)}</td>
                <td className="text-right px-2 py-2 font-mono text-xs">{numCell(r.d90plus)}</td>
                <td className="text-right px-3 py-2 font-mono font-semibold">{formatTSh(r.total)}</td>
              </tr>
            ))
          )}
          {rows.length > 0 && (
            <tr className="border-t-2 border-[#1a3d2e] font-bold">
              <td className="px-3 py-2">{isSw ? 'Jumla' : 'Total'}</td>
              <td className="text-right px-2 font-mono text-xs">{formatTSh(totals.current)}</td>
              <td className="text-right px-2 font-mono text-xs">{formatTSh(totals.d30)}</td>
              <td className="text-right px-2 font-mono text-xs">{formatTSh(totals.d60)}</td>
              <td className="text-right px-2 font-mono text-xs">{formatTSh(totals.d90)}</td>
              <td className="text-right px-2 font-mono text-xs">{formatTSh(totals.d90plus)}</td>
              <td className="text-right px-3 font-mono">{formatTSh(totals.total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
