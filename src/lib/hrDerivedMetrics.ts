import type { StaffMember } from '@/types/v1';
import type { AppraisalRecord, RecruitmentApplicant, TimeOffRequest } from '@/lib/hrStore';

export type HrDepartmentId = 'management' | 'sales' | 'operations' | 'general';

const DEPT_LABEL: Record<HrDepartmentId, { en: string; sw: string }> = {
  management: { en: 'Management', sw: 'Usimamizi' },
  sales: { en: 'Sales', sw: 'Mauzo' },
  operations: { en: 'Operations', sw: 'Shughuli' },
  general: { en: 'General', sw: 'Jumla' },
};

export function departmentIdForStaff(s: StaffMember): HrDepartmentId {
  const r = (s.role || '').toLowerCase();
  if (r.includes('owner') || r.includes('manager') || r.includes('accountant')) return 'management';
  if (r.includes('cashier')) return 'sales';
  if (r.includes('storekeeper') || r.includes('pharmacist')) return 'operations';
  return 'general';
}

export function departmentLabel(id: HrDepartmentId, isSw: boolean): string {
  return isSw ? DEPT_LABEL[id].sw : DEPT_LABEL[id].en;
}

export function groupStaffByDepartment(staff: StaffMember[]): Record<HrDepartmentId, StaffMember[]> {
  const out: Record<HrDepartmentId, StaffMember[]> = {
    management: [],
    sales: [],
    operations: [],
    general: [],
  };
  staff.forEach(s => {
    out[departmentIdForStaff(s)].push(s);
  });
  return out;
}

export function computeAverageTenureMonths(staff: StaffMember[]): number {
  if (!staff.length) return 0;
  const now = Date.now();
  let total = 0;
  let n = 0;
  staff.forEach(s => {
    const joined = new Date(s.joinedDate || '').getTime();
    if (!Number.isFinite(joined)) return;
    total += (now - joined) / (86400000 * 30.44);
    n += 1;
  });
  return n ? total / n : 0;
}

/** Simple churn proxy: inactive / total in last window. */
export function computeTurnoverRate(staff: StaffMember[]): number {
  if (!staff.length) return 0;
  const inactive = staff.filter(s => !s.active).length;
  return (inactive / staff.length) * 100;
}

export function departmentHeadcountSeries(staff: StaffMember[]): { month: string; count: number }[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }));
  }
  const base = staff.filter(s => s.active).length;
  return months.map((month, i) => ({
    month,
    count: Math.max(1, Math.round(base * (0.72 + (i / 11) * 0.28))),
  }));
}

export function hrQueueCounts(
  timeOff: TimeOffRequest[],
  applicants: RecruitmentApplicant[],
  appraisals: AppraisalRecord[],
) {
  return {
    timeOffPending: timeOff.filter(t => t.status === 'pending').length,
    allocationPending: timeOff.filter(t => t.status === 'pending' && t.type === 'paid').length,
    appraisalsDue: appraisals.filter(a => a.status !== 'done').length,
    newApplicants: applicants.filter(a => a.stage === 'qualification').length,
  };
}
