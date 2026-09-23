import React, { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Loader2, MapPin } from 'lucide-react';
import type { Language, StoreBranch } from '@/types/v1';
import { branchLabelForType } from '@/lib/branchSession';

interface BranchSwitcherProps {
  language: Language;
  branches: StoreBranch[];
  activeBranchId: string | null;
  activeBranchName?: string;
  canSwitch: boolean;
  switching?: boolean;
  onSwitchBranch: (branchId: string) => void;
  /** Compact: icon + name only (header). Full: includes helper text in dropdown. */
  variant?: 'header' | 'inline';
  className?: string;
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({
  language,
  branches,
  activeBranchId,
  activeBranchName,
  canSwitch,
  switching = false,
  onSwitchBranch,
  variant = 'header',
  className = '',
}) => {
  const isSw = language === 'sw';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active =
    branches.find(b => b.id === activeBranchId) ??
    (activeBranchName ? { id: activeBranchId || '', name: activeBranchName, type: 'sub_branch' as const } : null);

  const displayName = active?.name || activeBranchName || (isSw ? 'Tawi' : 'Branch');

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!activeBranchId && branches.length === 0) return null;

  if (!canSwitch || branches.length <= 1) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium max-w-[11rem] sm:max-w-[14rem] ${className}`}
        title={isSw ? 'Tawi lako la kazi' : 'Your working branch'}
      >
        <Building2 className="w-3.5 h-3.5 text-[#6264A7] shrink-0" />
        <span className="font-bold text-[#323130] truncate">{displayName}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={switching}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#E8EEF7] border border-[#C5D0E6] text-xs font-bold text-[#0F2347] hover:bg-[#dbe4f4] transition-all cursor-pointer max-w-[10.5rem] sm:max-w-[15rem] disabled:opacity-70"
        title={isSw ? 'Badilisha tawi — data zote zinasasishwa' : 'Switch branch — refreshes all data for that shop'}
      >
        {switching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#6264A7]" />
        )}
        <span className="truncate">{displayName}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[min(100vw-1.5rem,18rem)] bg-white rounded-xl border border-[#E1DFDD] shadow-xl z-50 py-1 animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 border-b border-[#F3F2F1]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A8886]">
              {isSw ? 'Chagua tawi' : 'Working branch'}
            </p>
            {variant === 'header' && (
              <p className="text-[11px] text-[#605E5C] mt-0.5">
                {isSw
                  ? 'Kila tawi lina data yake pekee.'
                  : 'One active branch — all screens show that shop only.'}
              </p>
            )}
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {branches.map(b => {
              const selected = b.id === activeBranchId;
              const typeLabel = branchLabelForType(b.type, isSw);
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (b.id !== activeBranchId) onSwitchBranch(b.id);
                    }}
                    className={`w-full flex items-start gap-2 px-3 py-2.5 text-left text-xs cursor-pointer ${
                      selected ? 'bg-[#E8EEF7]' : 'hover:bg-[#F8F8F8]'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {selected ? (
                        <Check className="w-4 h-4 text-[#107C10]" />
                      ) : (
                        <span className="w-4 h-4 inline-block" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-bold text-[#323130] block truncate">{b.name}</span>
                      <span className="text-[10px] text-[#605E5C] flex flex-wrap gap-1 mt-0.5">
                        {typeLabel && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold">{typeLabel}</span>
                        )}
                        {(b.district || b.address) && (
                          <span className="truncate">{b.district || b.address}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
