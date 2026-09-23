/** Branch-scoped HR data (Odoo-style modules) — local until full API. */

export type RecruitmentStage =
  | 'qualification'
  | 'interview'
  | 'contract'
  | 'hired';

export interface RecruitmentApplicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  stage: RecruitmentStage;
  rating: number;
  notes?: string;
  createdAt: string;
}

export type TimeOffType = 'paid' | 'sick' | 'unpaid';

export interface TimeOffRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: TimeOffType;
  dateFrom: string;
  dateTo: string;
  days: number;
  status: 'pending' | 'approved' | 'refused';
  reason?: string;
}

export interface AppraisalRecord {
  id: string;
  staffId: string;
  staffName: string;
  periodLabel: string;
  dueDate: string;
  status: 'scheduled' | 'in_progress' | 'done';
  managerScore?: number;
  selfScore?: number;
  notes?: string;
}

export interface HrStoreSnapshot {
  applicants: RecruitmentApplicant[];
  timeOff: TimeOffRequest[];
  appraisals: AppraisalRecord[];
}

const key = (tenantId: string, branchId?: string | null) =>
  `duka_hr_store:${tenantId}:${branchId || 'all'}`;

export function loadHrStore(tenantId: string, branchId?: string | null): HrStoreSnapshot {
  try {
    const raw = localStorage.getItem(key(tenantId, branchId));
    if (!raw) return { applicants: [], timeOff: [], appraisals: [] };
    const parsed = JSON.parse(raw) as HrStoreSnapshot;
    return {
      applicants: parsed.applicants ?? [],
      timeOff: parsed.timeOff ?? [],
      appraisals: parsed.appraisals ?? [],
    };
  } catch {
    return { applicants: [], timeOff: [], appraisals: [] };
  }
}

export function saveHrStore(
  tenantId: string,
  data: HrStoreSnapshot,
  branchId?: string | null,
): void {
  localStorage.setItem(key(tenantId, branchId), JSON.stringify(data));
}
