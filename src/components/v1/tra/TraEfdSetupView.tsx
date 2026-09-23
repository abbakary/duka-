import React, { useState } from 'react';
import { ShieldCheck, BarChart3, ChevronRight, ChevronDown } from 'lucide-react';
import type { Language } from '@/types/v1';
import { useTaxCompliance } from '@/context/TaxComplianceContext';
import { TraTaxConfigurationBlock } from '@/components/v1/tra/TraTaxConfigurationBlock';
import { TraEfdApiSection } from '@/components/v1/tra/TraEfdApiSection';

export const DUKA_REPORTS_HUB_KEY = 'duka_reports_hub';

interface TraEfdSetupViewProps {
  language: Language;
  businessName?: string;
  tinNumber?: string;
  /** Opens Finance → Reports with TRA fiscal tab */
  onOpenTraReports?: () => void;
}

export const TraEfdSetupView: React.FC<TraEfdSetupViewProps> = ({
  language,
  businessName,
  tinNumber,
  onOpenTraReports,
}) => {
  const isSw = language === 'sw';
  const { settings: taxSettings } = useTaxCompliance();
  const [efdOpen, setEfdOpen] = useState(false);

  const modeLabel =
    taxSettings.mode === 'tra_efd'
      ? isSw
        ? 'TRA EFD'
        : 'TRA EFD'
      : taxSettings.mode === 'non_vat'
        ? isSw
          ? 'Haijasajiliwa VAT'
          : 'Not VAT registered'
        : isSw
          ? 'VAT (ndani)'
          : 'VAT (manual)';

  const openReports = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DUKA_REPORTS_HUB_KEY, 'tra');
    }
    onOpenTraReports?.();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-white rounded-xl border border-[#E1DFDD] shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#E65100]">
              <ShieldCheck className="w-4 h-4" />
              {isSw ? 'Usanidi TRA' : 'TRA setup'}
            </div>
            <h2 className="text-lg font-bold text-[#323130] mt-1">
              {businessName || taxSettings.receiptBusinessName || (isSw ? 'Duka lako' : 'Your shop')}
            </h2>
            <p className="text-sm text-[#605E5C] mt-1">
              {isSw
                ? 'Chagua aina ya duka, kisha fungua kadi ili kuendelea — usionyeshe mipangilio yote mara moja.'
                : 'Pick your shop type, then open one card to continue — no long form on one screen.'}
            </p>
          </div>
          {onOpenTraReports && (
            <button
              type="button"
              onClick={openReports}
              className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#0F2347]/20 bg-[#0F2347]/5 text-[#0F2347] text-xs font-bold hover:bg-[#0F2347]/10 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              {isSw ? 'Ripoti TRA' : 'TRA reports'}
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
          )}
        </div>
        <p className="mt-3 text-xs font-semibold text-[#323130] inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF9F8] border border-[#EDEBE9]">
          {isSw ? 'Hali ya sasa:' : 'Current:'}{' '}
          <span className="text-[#E65100]">{modeLabel}</span>
          {tinNumber || taxSettings.tinNumber ? (
            <span className="text-[#605E5C] font-normal">· TIN {tinNumber || taxSettings.tinNumber}</span>
          ) : null}
        </p>
      </div>

      <TraTaxConfigurationBlock
        language={language}
        businessName={businessName}
        tinNumber={tinNumber}
        layout="progressive"
      />

      {taxSettings.mode === 'tra_efd' && (
        <div className="bg-white rounded-xl border border-[#E1DFDD] shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setEfdOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left cursor-pointer hover:bg-[#FAF9F8]"
          >
            <div>
              <p className="text-sm font-bold text-[#323130]">
                {isSw ? 'Hatua 2 · Muunganisho wa EFD (TRA)' : 'Step 2 · EFD connection (TRA)'}
              </p>
              <p className="text-xs text-[#605E5C] mt-0.5">
                {isSw
                  ? 'Client ID na Secret — fungua tu ikiwa tayari umesajili EFD.'
                  : 'Client ID & secret — open only when you are ready to connect EFD.'}
              </p>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-[#605E5C] shrink-0 transition-transform ${efdOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {efdOpen && (
            <div className="px-4 pb-4 border-t border-[#EDEBE9] pt-4">
              <TraEfdApiSection language={language} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
