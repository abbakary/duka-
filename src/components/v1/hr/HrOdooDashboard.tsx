import React, { useMemo } from 'react';
import { Users, UserPlus, CalendarOff, Star, ArrowRight } from 'lucide-react';
import type { Language, StaffMember } from '@/types/v1';
import {
  departmentLabel,
  groupStaffByDepartment,
  hrQueueCounts,
  type HrDepartmentId,
} from '@/lib/hrDerivedMetrics';
import type { AppraisalRecord, RecruitmentApplicant, TimeOffRequest } from '@/lib/hrStore';

const DEPT_ORDER: HrDepartmentId[] = ['management', 'sales', 'operations', 'general'];

interface HrOdooDashboardProps {
  language: Language;
  staffList: StaffMember[];
  timeOff: TimeOffRequest[];
  applicants: RecruitmentApplicant[];
  appraisals: AppraisalRecord[];
  onOpenEmployees: (dept?: HrDepartmentId) => void;
  onOpenRecruitment: () => void;
  onOpenTimeOff: () => void;
  onOpenAppraisals: () => void;
  onOpenReporting: () => void;
}

export const HrOdooDashboard: React.FC<HrOdooDashboardProps> = ({
  language,
  staffList,
  timeOff,
  applicants,
  appraisals,
  onOpenEmployees,
  onOpenRecruitment,
  onOpenTimeOff,
  onOpenAppraisals,
  onOpenReporting,
}) => {
  const isSw = language === 'sw';
  const grouped = useMemo(() => groupStaffByDepartment(staffList), [staffList]);
  const counts = useMemo(
    () => hrQueueCounts(timeOff, applicants, appraisals),
    [timeOff, applicants, appraisals],
  );

  const visibleDepts = DEPT_ORDER.filter(id => grouped[id].length > 0 || id !== 'general');
  const showGeneral = grouped.general.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#3d5c4a]">
          {isSw
            ? 'Dashibodi ya HR — idara, wafanyakazi, na foleni za idhini.'
            : 'HR dashboard — departments, employees, and approval queues.'}
        </p>
        <button
          type="button"
          onClick={onOpenReporting}
          className="text-sm font-bold text-[#107C10] hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          {isSw ? 'Ripoti' : 'Reporting'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(showGeneral ? DEPT_ORDER : visibleDepts).map(deptId => {
          const members = grouped[deptId];
          if (!members.length && deptId === 'general') return null;
          const absentToday = 0;
          const absenceCap = Math.max(3, members.length);
          return (
            <div
              key={deptId}
              className="bg-white border border-[#d4e8dc] rounded-lg overflow-hidden shadow-sm flex flex-col min-h-[200px]"
            >
              <div className="px-4 py-2 border-b border-[#e7f5ec] bg-[#f5faf7]">
                <h3 className="text-sm font-bold text-[#1a3d2e] uppercase tracking-wide">
                  {departmentLabel(deptId, isSw)}
                </h3>
              </div>
              <div className="p-4 flex flex-col sm:flex-row gap-4 flex-1">
                <button
                  type="button"
                  onClick={() => onOpenEmployees(deptId)}
                  className="shrink-0 px-6 py-8 sm:py-10 rounded-md bg-[#107C10] hover:bg-[#0E6A0E] text-white font-black text-lg tracking-wide cursor-pointer shadow-sm"
                >
                  {isSw ? 'WAFANYAKAZI' : 'EMPLOYEES'}
                </button>
                <ul className="flex-1 space-y-2 text-sm text-[#323130]">
                  {deptId === 'sales' && counts.newApplicants > 0 && (
                    <li>
                      <button
                        type="button"
                        onClick={onOpenRecruitment}
                        className="font-semibold text-[#107C10] hover:underline cursor-pointer"
                      >
                        {isSw ? 'Waombaji wapya' : 'New applicants'} ({counts.newApplicants})
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={onOpenAppraisals}
                      className="font-semibold hover:text-[#107C10] cursor-pointer text-left"
                    >
                      {isSw ? 'Tathmini' : 'Appraisals'} ({counts.appraisalsDue})
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={onOpenTimeOff}
                      className="font-semibold hover:text-[#107C10] cursor-pointer text-left"
                    >
                      {isSw ? 'Maombi ya likizo' : 'Time off requests'} ({counts.timeOffPending})
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={onOpenTimeOff}
                      className="font-semibold hover:text-[#107C10] cursor-pointer text-left"
                    >
                      {isSw ? 'Mgao wa likizo' : 'Allocation requests'} ({counts.allocationPending})
                    </button>
                  </li>
                </ul>
              </div>
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between text-xs text-[#5a7a68] mb-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {members.length} {isSw ? 'wafanyakazi' : 'employees'}
                  </span>
                  <span>
                    {isSw ? 'Kutokuwepo' : 'Absence'} {absentToday} / {absenceCap}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#e7f5ec] overflow-hidden">
                  <div
                    className="h-full bg-[#107C10]/70 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (absentToday / absenceCap) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: UserPlus, label: isSw ? 'Kuajiri' : 'Recruitment', action: onOpenRecruitment, n: applicants.length },
          { icon: CalendarOff, label: isSw ? 'Likizo' : 'Time off', action: onOpenTimeOff, n: counts.timeOffPending },
          { icon: Star, label: isSw ? 'Tathmini' : 'Appraisals', action: onOpenAppraisals, n: counts.appraisalsDue },
          { icon: Users, label: isSw ? 'Orodha' : 'Directory', action: () => onOpenEmployees(), n: staffList.length },
        ].map(item => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="bg-[#e7f5ec] border border-[#d4e8dc] rounded-lg p-4 text-left hover:bg-white transition-colors cursor-pointer"
          >
            <item.icon className="w-5 h-5 text-[#107C10] mb-2" />
            <p className="text-xs font-bold text-[#5a7a68]">{item.label}</p>
            <p className="text-xl font-black text-[#1a3d2e] mt-1">{item.n}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
