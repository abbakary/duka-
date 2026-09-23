import React, { useMemo, useState } from 'react';
import { Download, Printer, RefreshCw, CalendarRange } from 'lucide-react';
import type { AuthUser, Language, StoreBranch } from '@/types/v1';
import { buildReportCompanyInfo } from '@/lib/reportCompanyInfo';
import { formatTSh } from '@/utils/translations';
import { useTraReceipts } from '@/context/TraReceiptContext';
import { useTaxCompliance } from '@/context/TaxComplianceContext';
import { useDocumentTemplates } from '@/context/DocumentTemplateContext';
import { isIssuedTraReceipt } from '@/lib/traReceiptApiMap';
import { printHtmlPage } from '@/lib/documentRenderer';
import {
  renderTraFiscalReportPaper,
  traReportMetaFromSettings,
} from '@/lib/traFiscalReportPaper';
import { periodFromPreset, type ReportDatePreset } from '@/lib/standardReports';
import { vatReportLabels } from '@/lib/taxComplianceSettings';

interface TraReportsSectionProps {
  language: Language;
  currentUser?: AuthUser | null;
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  activeBranch?: StoreBranch | null;
}

function inPeriod(dateStr: string, from: string, to: string): boolean {
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

export const TraReportsSection: React.FC<TraReportsSectionProps> = ({
  language,
  currentUser,
  activeBranchId,
  activeBranchName,
  activeBranch,
}) => {
  const isSw = language === 'sw';
  const vatL = vatReportLabels(isSw);
  const { receipts, efdSettings, refreshReceipts, receiptsLoading } = useTraReceipts();
  const { settings: taxSettings } = useTaxCompliance();
  const { config: docConfig } = useDocumentTemplates();

  const [preset, setPreset] = useState<ReportDatePreset>('month');
  const [customFrom, setCustomFrom] = useState(() => periodFromPreset('month').from);
  const [customTo, setCustomTo] = useState(() => periodFromPreset('month').to);

  const period = useMemo(
    () => periodFromPreset(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo],
  );

  const periodReceipts = useMemo(
    () =>
      receipts.filter(r => {
        if (activeBranchId && r.branchId && r.branchId !== activeBranchId) return false;
        return inPeriod(r.receiptDate || r.createdAt, period.from, period.to);
      }),
    [receipts, period.from, period.to, activeBranchId],
  );

  const stats = useMemo(() => {
    const issued = periodReceipts.filter(isIssuedTraReceipt).length;
    const failed = periodReceipts.filter(r => r.status === 'failed').length;
    const pending = periodReceipts.filter(r => r.status === 'pending').length;
    const totalVat = periodReceipts.reduce((s, r) => s + r.totalVat, 0);
    const totalSales = periodReceipts.reduce((s, r) => s + r.totalInclTax, 0);
    const totalNet = periodReceipts.reduce((s, r) => s + r.totalExclTax, 0);
    return { issued, failed, pending, totalVat, totalSales, totalNet, count: periodReceipts.length };
  }, [periodReceipts]);

  const paperHtml = useMemo(() => {
    const company = buildReportCompanyInfo({
      isSw,
      currentUser,
      branding: docConfig.branding,
      activeBranch: activeBranch ?? null,
      activeBranchName,
    });
    const meta = traReportMetaFromSettings(taxSettings, efdSettings, docConfig.branding, {
      ownerName: company.branchManager || company.ownerName,
      branch: company.branch
        ? company.branchCode
          ? `${company.branch} (${company.branchCode})`
          : company.branch
        : undefined,
      periodFrom: period.from,
      periodTo: period.to,
    });
    meta.address = company.address || meta.address;
    meta.phone = company.phone || meta.phone;
    return renderTraFiscalReportPaper(periodReceipts, meta, isSw);
  }, [periodReceipts, taxSettings, efdSettings, docConfig.branding, currentUser, activeBranch, activeBranchName, period, isSw]);

  const handlePrintPdf = () => {
    printHtmlPage(isSw ? 'Ripoti TRA / EFD' : 'TRA / EFD Report', paperHtml, isSw);
  };

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <div className="bg-white rounded-xl border border-[#E1DFDD] p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#323130]">
            <CalendarRange className="w-4 h-4 text-[#E65100]" />
            {isSw ? 'Kipindi cha ripoti' : 'Report period'}
          </div>
          <button
            type="button"
            onClick={() => void refreshReceipts()}
            disabled={receiptsLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1DFDD] text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${receiptsLoading ? 'animate-spin' : ''}`} />
            {isSw ? 'Sawazisha risiti' : 'Sync receipts'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'quarter', 'year', 'custom'] as ReportDatePreset[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p);
                if (p !== 'custom') {
                  const next = periodFromPreset(p);
                  setCustomFrom(next.from);
                  setCustomTo(next.to);
                }
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                preset === p ? 'bg-[#E65100] text-white' : 'bg-[#F3F2F1] text-[#605E5C]'
              }`}
            >
              {p === 'today' && (isSw ? 'Leo' : 'Today')}
              {p === 'week' && (isSw ? 'Wiki' : 'Week')}
              {p === 'month' && (isSw ? 'Mwezi' : 'Month')}
              {p === 'quarter' && (isSw ? 'Robo' : 'Quarter')}
              {p === 'year' && (isSw ? 'Mwaka' : 'Year')}
              {p === 'custom' && (isSw ? 'Maalum' : 'Custom')}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] font-semibold text-[#605E5C] mb-1">{isSw ? 'Kuanzia' : 'From'}</label>
            <input
              type="date"
              value={period.from}
              onChange={e => {
                setPreset('custom');
                setCustomFrom(e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-[#E1DFDD] text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#605E5C] mb-1">{isSw ? 'Mpaka' : 'To'}</label>
            <input
              type="date"
              value={period.to}
              onChange={e => {
                setPreset('custom');
                setCustomTo(e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-[#E1DFDD] text-xs"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1DFDD] text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              {isSw ? 'Chapisha' : 'Print'}
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E65100] text-white text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              {isSw ? 'Pakua PDF' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 min-w-0">
        {[
          { label: isSw ? 'Risiti (kipindi)' : 'Receipts (period)', value: String(stats.count) },
          { label: isSw ? 'Zilizotolewa' : 'Issued', value: String(stats.issued), tone: 'text-emerald-700' },
          { label: isSw ? 'Zilizoshindwa' : 'Failed', value: String(stats.failed), tone: 'text-red-700' },
          { label: vatL.net, value: formatTSh(stats.totalNet), tone: 'text-[#0078D4]' },
          { label: vatL.vat, value: formatTSh(stats.totalVat), tone: 'text-[#E65100]' },
          { label: vatL.gross, value: formatTSh(stats.totalSales), tone: 'text-[#323130]' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-[#E1DFDD] p-4 shadow-xs min-w-0">
            <div className="text-[10px] font-bold uppercase text-[#605E5C] truncate">{c.label}</div>
            <div className={`text-lg font-bold mt-1 tabular-nums truncate ${c.tone ?? ''}`} title={c.value}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E1DFDD] overflow-hidden shadow-xs min-w-0">
        <div className="px-4 py-3 border-b border-[#EDEBE9] text-sm font-bold text-[#323130]">
          {isSw ? 'Daftari la risiti za TRA' : 'TRA receipt register'}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead className="bg-[#FAF9F8] text-[#605E5C]">
              <tr>
                <th className="text-left px-3 py-2 font-bold">{isSw ? 'Risiti' : 'Receipt'}</th>
                <th className="text-left px-3 py-2 font-bold">{isSw ? 'Tarehe' : 'Date'}</th>
                <th className="text-left px-3 py-2 font-bold">{isSw ? 'Mteja' : 'Customer'}</th>
                <th className="text-left px-3 py-2 font-bold">VRN / Z</th>
                <th className="text-left px-3 py-2 font-bold">{isSw ? 'Uthibitisho' : 'Verification'}</th>
                <th className="text-right px-3 py-2 font-bold">{vatL.net}</th>
                <th className="text-right px-3 py-2 font-bold">{vatL.vat}</th>
                <th className="text-right px-3 py-2 font-bold">{vatL.gross}</th>
                <th className="text-left px-3 py-2 font-bold">{isSw ? 'Hali' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {periodReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#605E5C]">
                    {isSw
                      ? 'Hakuna risiti katika kipindi hiki. Bonyeza “Sawazisha risiti” au kamilisha mauzo ya TRA kwenye POS.'
                      : 'No receipts in this period. Click “Sync receipts” or complete TRA fiscal sales on POS.'}
                  </td>
                </tr>
              ) : (
                periodReceipts.map(r => (
                  <tr key={r.id} className="border-t border-[#EDEBE9] hover:bg-[#FAF9F8]">
                    <td className="px-3 py-2 font-mono text-[10px]">{r.receiptNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.receiptDate}
                      <span className="text-[#8A8886] ml-1">{r.receiptTime?.slice(0, 5)}</span>
                    </td>
                    <td className="px-3 py-2 max-w-[120px] truncate">{r.customerName}</td>
                    <td className="px-3 py-2 text-[10px]">
                      <div>{r.vrn || efdSettings.companyVrn || '—'}</div>
                      <div className="text-[#8A8886]">Z: {r.zNumber || efdSettings.companySerial || '—'}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] max-w-[100px] truncate">{r.verificationCode || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTSh(r.totalExclTax)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTSh(r.totalVat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatTSh(r.totalInclTax)}</td>
                    <td className="px-3 py-2">
                      {r.isDemo || r.status === 'demo'
                        ? 'Demo'
                        : r.status === 'success'
                          ? isSw
                            ? 'Imefanikiwa'
                            : 'Success'
                          : r.status === 'failed'
                            ? isSw
                              ? 'Imeshindwa'
                              : 'Failed'
                            : isSw
                              ? 'Inasubiri'
                              : 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-[#D0D4DC] bg-[linear-gradient(160deg,#E8EAEE_0%,#F4F5F7_45%,#DEE2E8_100%)] p-3 sm:p-5 shadow-inner min-w-0 max-w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#605E5C]">
            {isSw ? 'Muhtasari wa karatasi A4 (TRA)' : 'TRA A4 paper preview'}
          </div>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E65100] text-white text-[10px] font-bold"
          >
            <Printer className="w-3 h-3" />
            {isSw ? 'Chapisha / PDF' : 'Print / PDF'}
          </button>
        </div>
        <div
          className="w-full max-w-full overflow-x-auto overflow-y-auto rounded-sm border border-[#E5E7EB]/80 bg-[#ECEFF3]"
          style={{ maxHeight: 'min(75vh, 880px)', WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="py-3 px-2 sm:px-4 inline-block min-w-full"
            style={{ width: 'max-content', minWidth: '100%' }}
            dangerouslySetInnerHTML={{ __html: paperHtml }}
          />
        </div>
        <p className="text-[10px] text-[#8A8886] mt-2">
          {isSw
            ? 'Telezesha kushoto/kulia kuona safu zote. Pakua PDF kupitia dirisha la kuchapisha.'
            : 'Scroll horizontally for all columns. Use Print → Save as PDF to download.'}
        </p>
      </div>
    </div>
  );
};
