import React from 'react';
import type { Language, StaffMember } from '@/types/v1';
import type { AppraisalRecord } from '@/lib/hrStore';

interface HrAppraisalsPanelProps {
  language: Language;
  staffList: StaffMember[];
  appraisals: AppraisalRecord[];
  onChange: (next: AppraisalRecord[]) => void;
}

export const HrAppraisalsPanel: React.FC<HrAppraisalsPanelProps> = ({
  language,
  staffList,
  appraisals,
  onChange,
}) => {
  const isSw = language === 'sw';

  const scheduleAll = () => {
    const due = new Date();
    due.setMonth(due.getMonth() + 6);
    const dueStr = due.toISOString().slice(0, 10);
    const existing = new Set(appraisals.map(a => a.staffId));
    const added = staffList
      .filter(s => s.active && !existing.has(s.id))
      .map(
        (s): AppraisalRecord => ({
          id: `apr-${s.id}-${Date.now()}`,
          staffId: s.id,
          staffName: s.name,
          periodLabel: isSw ? 'Tathmini ya 6 miezi' : '6-month review',
          dueDate: dueStr,
          status: 'scheduled',
        }),
      );
    onChange([...added, ...appraisals]);
  };

  const advance = (id: string) => {
    onChange(
      appraisals.map(a => {
        if (a.id !== id) return a;
        if (a.status === 'scheduled') return { ...a, status: 'in_progress' as const };
        if (a.status === 'in_progress') return { ...a, status: 'done' as const, managerScore: 4, selfScore: 4 };
        return a;
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={scheduleAll}
          className="px-4 py-2 rounded-md bg-[#107C10] text-white text-sm font-bold cursor-pointer"
        >
          {isSw ? 'Panga tathmini (6 miezi)' : 'Schedule 6-month appraisals'}
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {appraisals.length === 0 ? (
          <p className="text-sm text-[#5a7a68] col-span-full">{isSw ? 'Hakuna tathmini bado.' : 'No appraisals yet.'}</p>
        ) : (
          appraisals.map(a => (
            <div key={a.id} className="bg-white border border-[#d4e8dc] rounded-lg p-4">
              <p className="font-bold text-[#1a3d2e]">{a.staffName}</p>
              <p className="text-xs text-[#5a7a68] mt-1">{a.periodLabel}</p>
              <p className="text-xs mt-1">
                {isSw ? 'Mwisho' : 'Due'}: {a.dueDate}
              </p>
              <span
                className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  a.status === 'done'
                    ? 'bg-[#e7f5ec] text-[#107C10]'
                    : a.status === 'in_progress'
                      ? 'bg-amber-50 text-amber-900'
                      : 'bg-[#f5faf7] text-[#5a7a68]'
                }`}
              >
                {a.status.replace('_', ' ')}
              </span>
              {a.status !== 'done' && (
                <button
                  type="button"
                  onClick={() => advance(a.id)}
                  className="mt-3 w-full py-2 rounded-md border border-[#d4e8dc] text-xs font-bold text-[#107C10] cursor-pointer hover:bg-[#f5faf7]"
                >
                  {isSw ? 'Endelea' : 'Advance'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
