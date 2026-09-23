import React, { useState } from 'react';
import { BarChart3, Receipt, ShieldCheck } from 'lucide-react';
import type { AuthUser, Language, StoreBranch } from '@/types/v1';
import { TraReportsSection } from '@/components/v1/tra/TraReportsSection';
import { TraReceiptsSection } from '@/components/v1/tra/TraReceiptsSection';

export type TraFiscalSubTab = 'reports' | 'receipts';

export const DUKA_TRA_FISCAL_SUBTAB_KEY = 'duka_tra_fiscal_subtab';

interface TraFiscalReportsHubProps {
  language: Language;
  currentUser?: AuthUser | null;
  initialSubTab?: TraFiscalSubTab;
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  activeBranch?: StoreBranch | null;
}

export const TraFiscalReportsHub: React.FC<TraFiscalReportsHubProps> = ({
  language,
  currentUser,
  initialSubTab = 'reports',
  activeBranchId,
  activeBranchName,
  activeBranch,
}) => {
  const isSw = language === 'sw';
  const [subTab, setSubTab] = useState<TraFiscalSubTab>(() => {
    if (typeof sessionStorage === 'undefined') return initialSubTab;
    const boot = sessionStorage.getItem(DUKA_TRA_FISCAL_SUBTAB_KEY);
    if (boot === 'reports' || boot === 'receipts') {
      sessionStorage.removeItem(DUKA_TRA_FISCAL_SUBTAB_KEY);
      return boot;
    }
    return initialSubTab;
  });

  const tabs: { id: TraFiscalSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'reports', label: isSw ? 'Ripoti za TRA' : 'TRA fiscal reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'receipts', label: isSw ? 'Daftari la risiti' : 'Receipt register', icon: <Receipt className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <div className="bg-gradient-to-r from-[#0F2347] to-[#1a3a6b] rounded-xl px-4 py-3 text-white shadow-sm">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-90">
          <ShieldCheck className="w-4 h-4" />
          TRA / VEFD
        </div>
        <p className="text-xs opacity-90 mt-1">
          {isSw
            ? 'Ripoti za kifaa cha elektroniki, muhtasari wa VAT, na risiti zilizotumwa TRA.'
            : 'Electronic fiscal device reports, VAT summaries, and receipts sent to TRA.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-white rounded-xl border border-[#E1DFDD] shadow-xs w-full max-w-lg">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === t.id ? 'bg-[#E65100] text-white' : 'text-[#605E5C] hover:bg-[#F3F2F1]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'reports' ? (
        <TraReportsSection
          language={language}
          currentUser={currentUser}
          activeBranchId={activeBranchId}
          activeBranchName={activeBranchName}
          activeBranch={activeBranch}
        />
      ) : (
        <TraReceiptsSection language={language} />
      )}
    </div>
  );
};
