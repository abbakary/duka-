import React from 'react';
import type { Language, StaffMember } from '@/types/v1';
import { departmentIdForStaff, departmentLabel } from '@/lib/hrDerivedMetrics';
import { StaffAvatar } from '@/components/v1/hr/StaffAvatar';

interface HrEmployeeDirectoryCardsProps {
  language: Language;
  staffList: StaffMember[];
  filterDept?: ReturnType<typeof departmentIdForStaff>;
  onView?: (staff: StaffMember) => void;
}

export const HrEmployeeDirectoryCards: React.FC<HrEmployeeDirectoryCardsProps> = ({
  language,
  staffList,
  filterDept,
  onView,
}) => {
  const isSw = language === 'sw';
  const rows = filterDept
    ? staffList.filter(s => departmentIdForStaff(s) === filterDept)
    : staffList;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map(s => (
        <article
          key={s.id}
          className="bg-white border border-[#E1DFDD] rounded-xl p-4 flex items-start gap-3 hover:border-[#107C10]/40 hover:shadow-sm transition-shadow"
        >
          <StaffAvatar staff={s} size="lg" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#323130] leading-snug">{s.name}</h4>
            <p className="text-xs text-[#605E5C] mt-0.5">{s.role}</p>
            <p className="text-[10px] text-[#107C10] font-semibold mt-1">
              {departmentLabel(departmentIdForStaff(s), isSw)}
            </p>
            {!s.active && (
              <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                {isSw ? 'Imesimamishwa' : 'Inactive'}
              </span>
            )}
            {onView && (
              <button
                type="button"
                onClick={() => onView(s)}
                className="mt-2 text-[11px] font-bold text-[#107C10] cursor-pointer"
              >
                {isSw ? 'Angalia wasifu →' : 'View profile →'}
              </button>
            )}
          </div>
        </article>
      ))}
      {rows.length === 0 && (
        <p className="col-span-full text-sm text-[#5a7a68] py-8 text-center">
          {isSw ? 'Hakuna wafanyakazi katika idara hii.' : 'No employees in this department.'}
        </p>
      )}
    </div>
  );
};
