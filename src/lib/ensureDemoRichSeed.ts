import { api } from '@/lib/api';
import { demoProductImageUrl, isSampleDemoEmail } from '@/lib/demoMediaUrls';
import { loadHrStore, saveHrStore, type HrStoreSnapshot } from '@/lib/hrStore';
import type { BusinessType, Product, StaffMember } from '@/types/v1';

const ENRICH_KEY = 'duka_demo_enrich_version';
const ENRICH_VERSION = '2026-09-22-jengo-hardware-v1';

function defaultHrSeed(staffList: StaffMember[]): HrStoreSnapshot {
  const names = staffList.filter(s => s.active).slice(0, 4);
  const today = new Date().toISOString().slice(0, 10);
  return {
    applicants: [
      {
        id: 'demo-app-1',
        name: 'Grace Mushi',
        email: 'grace.m@mail.co.tz',
        phone: '+255712000001',
        jobTitle: 'Cashier',
        stage: 'interview',
        rating: 4,
        notes: 'Retail experience — Kariakoo market',
        createdAt: today,
      },
      {
        id: 'demo-app-2',
        name: 'Omari Hamisi',
        email: 'omari.h@mail.co.tz',
        phone: '+255712000002',
        jobTitle: 'Storekeeper',
        stage: 'qualification',
        rating: 3,
        createdAt: today,
      },
      {
        id: 'demo-app-3',
        name: 'Lucy Temba',
        email: 'lucy.t@mail.co.tz',
        phone: '+255712000003',
        jobTitle: 'Accountant',
        stage: 'contract',
        rating: 5,
        createdAt: today,
      },
    ],
    timeOff: names.slice(0, 2).map((s, i) => ({
      id: `demo-to-${i}`,
      staffId: s.id,
      staffName: s.name,
      type: i === 0 ? ('paid' as const) : ('sick' as const),
      dateFrom: today,
      dateTo: today,
      days: 1,
      status: i === 0 ? ('approved' as const) : ('pending' as const),
      reason: i === 0 ? 'Family visit' : 'Flu',
    })),
    appraisals: names.slice(0, 3).map((s, i) => ({
      id: `demo-ap-${i}`,
      staffId: s.id,
      staffName: s.name,
      periodLabel: 'Q1 2026',
      dueDate: today,
      status: i === 0 ? ('in_progress' as const) : ('scheduled' as const),
      managerScore: i === 0 ? 4.2 : undefined,
      selfScore: i === 0 ? 4.0 : undefined,
    })),
  };
}

export function applyClientDemoMedia(
  products: Product[],
  staff: StaffMember[],
  businessType?: BusinessType,
): { products: Product[]; staff: StaffMember[] } {
  const nextProducts = products.map((p, i) =>
    p.imageUrl?.startsWith('http')
      ? p
      : {
          ...p,
          imageUrl: demoProductImageUrl(businessType ?? p.businessType, p.sku || p.id, i),
        },
  );
  return { products: nextProducts, staff };
}

export function ensureLocalHrDemoSeed(
  tenantId: string,
  branchId: string | null | undefined,
  staffList: StaffMember[],
): void {
  const current = loadHrStore(tenantId, branchId);
  if (current.applicants.length > 0) return;
  saveHrStore(tenantId, defaultHrSeed(staffList), branchId);
}

/** Call backend enrich + local HR seed for @sample.dukaplus.co.tz logins. */
export async function ensureDemoRichSeed(options: {
  userEmail?: string | null;
  tenantId: string;
  branchId?: string | null;
  staffList: StaffMember[];
  refreshTenant?: () => Promise<void>;
}): Promise<void> {
  if (!isSampleDemoEmail(options.userEmail)) return;

  ensureLocalHrDemoSeed(options.tenantId, options.branchId, options.staffList);
  if (api.hasValidSession()) {
    const localHr = loadHrStore(options.tenantId, options.branchId);
    if (localHr.applicants.length > 0) {
      void api.saveHrWorkspace(localHr, options.branchId).catch(() => undefined);
    }
  }

  const last = localStorage.getItem(ENRICH_KEY);
  if (last === ENRICH_VERSION) return;

  try {
    await api.enrichSampleDemo();
    localStorage.setItem(ENRICH_KEY, ENRICH_VERSION);
    if (options.refreshTenant) await options.refreshTenant();
  } catch {
    /* Railway may lag deploy — client fallbacks still apply */
    localStorage.setItem(ENRICH_KEY, ENRICH_VERSION);
  }
}
