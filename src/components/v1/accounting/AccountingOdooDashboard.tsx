import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowRight,
  Banknote,
  Building2,
  FileText,
  Landmark,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { Language, PurchaseOrder, SaleTransaction } from '@/types/v1';
import { formatTSh } from '@/utils/translations';
import {
  buildWeeklyActivity,
  countPendingCustomerInvoices,
  countVendorBillsDue,
  sumVatCollected,
  type AccountingBooksMode,
} from '@/lib/accountingDerivedReports';

const GREEN = '#107C10';
const GREEN_LIGHT = '#6db88a';
const MILK = '#f0faf4';

interface AccountingOdooDashboardProps {
  language: Language;
  sales: SaleTransaction[];
  purchaseOrders: PurchaseOrder[];
  booksMode: AccountingBooksMode;
  onOpenReporting: (focus?: string) => void;
  onOpenOperations: (tab: 'journal' | 'trial' | 'accounts') => void;
}

export const AccountingOdooDashboard: React.FC<AccountingOdooDashboardProps> = ({
  language,
  sales,
  purchaseOrders,
  booksMode,
  onOpenReporting,
  onOpenOperations,
}) => {
  const isSw = language === 'sw';
  const weekly = useMemo(() => buildWeeklyActivity(sales, purchaseOrders), [sales, purchaseOrders]);
  const invCounts = useMemo(() => countPendingCustomerInvoices(sales), [sales]);
  const billCounts = useMemo(() => countVendorBillsDue(purchaseOrders), [purchaseOrders]);
  const vatTotal = useMemo(() => sumVatCollected(sales), [sales]);

  const cardShell =
    'bg-white rounded-lg border border-[#d4e8dc] shadow-sm overflow-hidden flex flex-col min-h-[220px]';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-sm text-[#3d5c4a] max-w-2xl">
          {isSw
            ? 'Dashibodi ya uhasibu — ankara za wateja, bili za wasambazaji, benki, na TRA/VAT katika mwonekano mmoja.'
            : 'Accounting dashboard — customer invoices, vendor bills, bank, cash, and TRA/VAT in one workspace.'}
        </p>
        <button
          type="button"
          onClick={() => onOpenReporting('income')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#107C10] text-white text-sm font-bold hover:bg-[#0E6A0E] cursor-pointer"
        >
          {isSw ? 'Ripoti za kifedha' : 'Financial reports'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Customer invoices */}
        <div className={cardShell}>
          <div className="px-4 py-3 border-b border-[#e7f5ec] flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-[#107C10] font-bold text-sm">
                <Receipt className="w-4 h-4" />
                {isSw ? 'Ankara za wateja' : 'Customer invoices'}
              </div>
              <p className="text-xs text-[#5a7a68] mt-0.5">
                {invCounts} {isSw ? 'zinahitaji hatua / malipo' : 'to validate / unpaid'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenReporting('aged-rec')}
              className="text-xs font-bold text-[#107C10] hover:underline cursor-pointer"
            >
              {isSw ? 'Fungua' : 'Open'}
            </button>
          </div>
          <div className="px-4 py-2 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
              {invCounts} {isSw ? 'inayosubiri' : 'open'}
            </span>
          </div>
          <div className="flex-1 min-h-[120px] px-2 pb-2">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={MILK} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#5a7a68' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => formatTSh(v)}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #d4e8dc' }}
                />
                <Bar dataKey="revenue" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={28} name={isSw ? 'Mauzo' : 'Revenue'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor bills */}
        <div className={cardShell}>
          <div className="px-4 py-3 border-b border-[#e7f5ec] flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#107C10] font-bold text-sm">
                <FileText className="w-4 h-4" />
                {isSw ? 'Bili za wasambazaji' : 'Vendor bills'}
              </div>
              <p className="text-xs text-[#5a7a68] mt-0.5">
                {billCounts.draft} {isSw ? 'rasimu' : 'draft'} · {billCounts.toPay}{' '}
                {isSw ? 'malipo' : 'to pay'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenReporting('aged-pay')}
              className="text-xs font-bold text-[#107C10] hover:underline cursor-pointer"
            >
              {isSw ? 'Fungua' : 'Open'}
            </button>
          </div>
          <div className="px-4 py-2 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-[#107C10] text-white font-bold cursor-default">
              {isSw ? 'BILI MPYA' : 'NEW BILL'}
            </span>
            <span className="px-2 py-1 rounded-full bg-[#f0faf4] text-[#1e4d36] border border-[#d4e8dc] font-semibold">
              {billCounts.pending} {isSw ? 'inasubiri pokeo' : 'pending receipt'}
            </span>
          </div>
          <div className="flex-1 min-h-[120px] px-2 pb-2">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={MILK} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#5a7a68' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatTSh(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="bills" fill={GREEN_LIGHT} radius={[3, 3, 0, 0]} maxBarSize={28} name={isSw ? 'Manunuzi' : 'Purchases'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bank */}
        <div className={cardShell}>
          <div className="px-4 py-3 border-b border-[#e7f5ec]">
            <div className="flex items-center gap-2 text-[#107C10] font-bold text-sm">
              <Landmark className="w-4 h-4" />
              {isSw ? 'Benki' : 'Bank'}
            </div>
          </div>
          <div className="px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5a7a68]">{isSw ? 'Salio (makadirio)' : 'Balance in GL'}</span>
              <span className="font-mono font-bold text-[#1a3d2e]">{formatTSh(weekly.reduce((a, w) => a + w.revenue, 0) * 0.2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#5a7a68]">{isSw ? 'Tofauti na taarifa' : 'Statement diff.'}</span>
              <span className="font-mono text-amber-800">0</span>
            </div>
          </div>
          <div className="flex-1 min-h-[100px] px-2 pb-2">
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Line type="monotone" dataKey="revenue" stroke="#2d6a4f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => onOpenOperations('journal')}
              className="text-xs font-bold text-[#107C10] hover:underline cursor-pointer"
            >
              {isSw ? 'Reconciliation →' : 'Reconcile →'}
            </button>
          </div>
        </div>

        {/* Cash */}
        <div className={cardShell}>
          <div className="px-4 py-3 border-b border-[#e7f5ec]">
            <div className="flex items-center gap-2 text-[#107C10] font-bold text-sm">
              <Wallet className="w-4 h-4" />
              {isSw ? 'Fedha taslimu' : 'Cash'}
            </div>
          </div>
          <div className="px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5a7a68]">{isSw ? 'Salio la droo' : 'Cash drawer balance'}</span>
              <span className="font-mono font-bold">{formatTSh(weekly[weekly.length - 1]?.revenue || 0)}</span>
            </div>
          </div>
          <div className="flex-1 min-h-[100px] px-2 pb-2">
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={weekly}>
                <Line type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} dot={{ r: 2, fill: GREEN }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TRA / VAT */}
        <div className={cardShell}>
          <div className="px-4 py-3 border-b border-[#e7f5ec]">
            <div className="flex items-center gap-2 text-[#107C10] font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              {booksMode === 'tra' ? 'TRA / EFD / VAT' : isSw ? 'Kodi (kawaida)' : 'Tax (standard books)'}
            </div>
          </div>
          <div className="px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5a7a68]">{isSw ? 'VAT iliyokusanywa' : 'Output VAT collected'}</span>
              <span className="font-mono font-bold">{formatTSh(booksMode === 'tra' ? vatTotal : 0)}</span>
            </div>
            <p className="text-[11px] text-[#5a7a68] leading-snug">
              {booksMode === 'tra'
                ? isSw
                  ? 'Vitabu vinaonyesha VAT kwa mujibu wa TRA; ripoti za EFD ziko chini ya Fedha → Ripoti.'
                  : 'Books show VAT per TRA; EFD fiscal reports live under Finance → Reports.'
                : isSw
                  ? 'Hali ya vitabu vya kawaida — VAT haijaongezwa kwenye mistari ya kodi.'
                  : 'Standard books mode — VAT lines hidden from tax section.'}
            </p>
          </div>
          <div className="flex-1 min-h-[80px] px-2 pb-2">
            {booksMode === 'tra' && (
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={weekly}>
                  <Bar dataKey="vat" fill="#2d6a4f" radius={[2, 2, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Miscellaneous */}
        <div className={cardShell}>
          <div className="px-4 py-3 border-b border-[#e7f5ec]">
            <div className="flex items-center gap-2 text-[#107C10] font-bold text-sm">
              <Building2 className="w-4 h-4" />
              {isSw ? 'Shughuli nyingine' : 'Miscellaneous'}
            </div>
          </div>
          <ul className="px-4 py-3 text-sm space-y-2 text-[#3d5c4a]">
            <li className="flex justify-between">
              <span>{isSw ? 'Mizani ya majaribio' : 'Trial balance'}</span>
              <button type="button" onClick={() => onOpenOperations('trial')} className="text-[#107C10] font-bold text-xs cursor-pointer">
                {isSw ? 'Fungua' : 'Open'}
              </button>
            </li>
            <li className="flex justify-between">
              <span>{isSw ? 'Chati ya akaunti' : 'Chart of accounts'}</span>
              <button type="button" onClick={() => onOpenOperations('accounts')} className="text-[#107C10] font-bold text-xs cursor-pointer">
                {isSw ? 'Fungua' : 'Open'}
              </button>
            </li>
            <li className="flex justify-between">
              <span>{isSw ? 'Mtiririko wa fedha' : 'Cash flow statement'}</span>
              <button type="button" onClick={() => onOpenReporting('cashflow')} className="text-[#107C10] font-bold text-xs cursor-pointer">
                {isSw ? 'Ripoti' : 'Report'}
              </button>
            </li>
          </ul>
          <div className="mt-auto px-4 pb-3 flex items-center gap-2 text-xs text-[#5a7a68]">
            <Banknote className="w-3.5 h-3.5" />
            {isSw ? 'Ingizo za shuaraba zinasawazisha kiotomatiki' : 'Journal entries must balance debits & credits'}
          </div>
        </div>
      </div>
    </div>
  );
};
