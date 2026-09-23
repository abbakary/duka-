import React from 'react';
import { ShieldCheck, BarChart3, ChevronRight, Link2 } from 'lucide-react';
import type { Language } from '@/types/v1';
import { useTaxCompliance } from '@/context/TaxComplianceContext';
import { TraTaxConfigurationBlock } from '@/components/v1/tra/TraTaxConfigurationBlock';
import { TraEfdApiSection } from '@/components/v1/tra/TraEfdApiSection';

const SETUP_SECTIONS = [
  { id: 'tra-tax-mode', labelEn: '1 · Tax mode', labelSw: '1 · Hali ya kodi' },
  { id: 'tra-efd-api', labelEn: '2 · EFD connection', labelSw: '2 · Muunganisho EFD' },
] as const;

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

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const modeLabel =
    taxSettings.mode === 'tra_efd'
      ? isSw
        ? 'TRA EFD imewashwa'
        : 'TRA EFD active'
      : taxSettings.mode === 'non_vat'
        ? isSw
          ? 'Sio msajili wa VAT'
          : 'Not VAT registered'
        : isSw
          ? 'VAT manual'
          : 'Manual VAT';

  const openReports = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DUKA_REPORTS_HUB_KEY, 'tra');
    }
    onOpenTraReports?.();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-[#E1DFDD] shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#E65100]">
              <ShieldCheck className="w-4 h-4" />
              {isSw ? 'Usanidi TRA & EFD' : 'TRA & EFD configuration'}
            </div>
            <h2 className="text-lg font-bold text-[#323130] mt-1">
              {businessName || taxSettings.receiptBusinessName || (isSw ? 'Duka lako' : 'Your shop')}
            </h2>
            <p className="text-xs text-[#605E5C] mt-1">
              {modeLabel}
              {tinNumber || taxSettings.tinNumber ? ` · TIN ${tinNumber || taxSettings.tinNumber}` : ''}
            </p>
            <p className="text-xs text-[#605E5C] mt-2 max-w-xl">
              {isSw
                ? 'Weka hali ya kodi na Client ID/Secret ya VEFD hapa. Risiti na ripoti za TRA ziko chini ya Fedha → Ripoti.'
                : 'Set tax mode and VEFD Client ID/secret here. TRA receipts and fiscal reports live under Finance → Reports.'}
            </p>
          </div>
          {onOpenTraReports && (
            <button
              type="button"
              onClick={openReports}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F2347] text-white text-xs font-bold hover:brightness-110 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              {isSw ? 'Ripoti & risiti TRA' : 'TRA reports & receipts'}
              <ChevronRight className="w-4 h-4 opacity-80" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 sticky top-0 z-10 bg-[#FAF9F8]/95 backdrop-blur-sm border border-[#E1DFDD] rounded-xl p-2 shadow-xs">
        <span className="text-[10px] font-bold uppercase text-[#605E5C] px-2 py-1.5 self-center flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          {isSw ? 'Hatua:' : 'Steps:'}
        </span>
        {SETUP_SECTIONS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToSection(s.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#EDEBE9] hover:border-[#E65100]/40 hover:text-[#E65100] text-[#323130] cursor-pointer"
          >
            {isSw ? s.labelSw : s.labelEn}
          </button>
        ))}
      </nav>

      <TraTaxConfigurationBlock language={language} businessName={businessName} tinNumber={tinNumber} />

      <TraEfdApiSection language={language} />
    </div>
  );
};
