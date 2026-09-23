import React from 'react';
import { ArrowLeft, Printer, ExternalLink, CheckCircle2, XCircle, Clock, FlaskConical } from 'lucide-react';
import type { TraReceipt, TraReceiptStatus } from '@/types/traReceipt';
import { formatTSh } from '@/utils/translations';
import { printTraFiscalSlip } from '@/lib/traFiscalSlip';
import { buildTraSlipMeta } from '@/lib/traFiscalSlipMeta';
import { TraFiscalSlipPreview } from '@/components/v1/TraFiscalSlipPreview';
import { useTaxCompliance } from '@/context/TaxComplianceContext';
import { useTraReceipts } from '@/context/TraReceiptContext';

function statusBadge(status: TraReceiptStatus, isDemo: boolean, isSw: boolean) {
  if (isDemo || status === 'demo') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <FlaskConical className="w-3 h-3" /> Demo
      </span>
    );
  }
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Success
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
      <Clock className="w-3 h-3" /> {isSw ? 'Inasubiri' : 'Pending'}
    </span>
  );
}

interface TraReceiptDetailPanelProps {
  receipt: TraReceipt;
  isSw: boolean;
  onBack: () => void;
}

export const TraReceiptDetailPanel: React.FC<TraReceiptDetailPanelProps> = ({
  receipt,
  isSw,
  onBack,
}) => {
  const { settings: taxSettings } = useTaxCompliance();
  const { efdSettings } = useTraReceipts();

  const printReceipt = () => {
    printTraFiscalSlip(
      receipt,
      taxSettings,
      buildTraSlipMeta(efdSettings, taxSettings, {
        datetimeIso: `${receipt.receiptDate}T${receipt.receiptTime}`,
      }),
      isSw,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E1DFDD] text-sm font-semibold hover:bg-[#F3F2F1]"
        >
          <ArrowLeft className="w-4 h-4" />
          {isSw ? 'Rudi kwenye orodha' : 'Back to list'}
        </button>
        <button
          type="button"
          onClick={printReceipt}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#323130] text-white text-sm font-semibold hover:bg-[#201F1E]"
        >
          <Printer className="w-4 h-4" />
          {isSw ? 'Chapisha risiti ya TRA' : 'Print TRA slip'}
        </button>
        {receipt.verificationLink && (
          <a
            href={receipt.verificationLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0078D4] text-[#0078D4] text-sm font-semibold hover:bg-blue-50"
          >
            <ExternalLink className="w-4 h-4" />
            {isSw ? 'Thibitisha TRA' : 'Verify on TRA'}
          </a>
        )}
        {statusBadge(receipt.status, receipt.isDemo, isSw)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E1DFDD] p-4 shadow-xs overflow-auto">
          <TraFiscalSlipPreview
            receipt={receipt}
            tax={taxSettings}
            meta={buildTraSlipMeta(efdSettings, taxSettings, {
              datetimeIso: `${receipt.receiptDate}T${receipt.receiptTime}`,
            })}
          />
        </div>
        <div className="bg-white rounded-xl border border-[#E1DFDD] p-5 shadow-xs space-y-3">
          <h3 className="text-base font-bold text-[#323130]">
            {isSw ? 'Maelezo ya haraka' : 'Quick details'}
          </h3>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-[#605E5C] text-xs uppercase font-bold">Receipt</span>
              <div className="font-semibold">{receipt.receiptNumber}</div>
            </div>
            <div>
              <span className="text-[#605E5C] text-xs uppercase font-bold">Verification</span>
              <div className="font-semibold break-all">{receipt.verificationCode || '—'}</div>
            </div>
            <div>
              <span className="text-[#605E5C] text-xs uppercase font-bold">Total</span>
              <div className="font-semibold">{formatTSh(receipt.totalInclTax)}</div>
            </div>
            <div>
              <span className="text-[#605E5C] text-xs uppercase font-bold">Customer</span>
              <div className="font-semibold">{receipt.customerName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
