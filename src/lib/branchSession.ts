import type { AuthUser } from '@/types/v1';

const KEY_PREFIX = 'duka_active_branch_';

export function activeBranchStorageKey(tenantId: string): string {
  return `${KEY_PREFIX}${tenantId}`;
}

export function loadPersistedActiveBranchId(tenantId: string | null | undefined): string | null {
  if (!tenantId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(activeBranchStorageKey(tenantId));
    return raw && raw !== 'all' ? raw : null;
  } catch {
    return null;
  }
}

export function savePersistedActiveBranchId(tenantId: string | null | undefined, branchId: string): void {
  if (!tenantId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(activeBranchStorageKey(tenantId), branchId);
  } catch {
    /* ignore quota */
  }
}

export function clearPersistedActiveBranchId(tenantId: string | null | undefined): void {
  if (!tenantId || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(activeBranchStorageKey(tenantId));
  } catch {
    /* ignore */
  }
}

/** HQ / owner can pick any branch; branch staff are locked to their branch. */
export function canSwitchTenantBranch(user: AuthUser | null | undefined): boolean {
  if (!user || user.isBranchScoped) return false;
  if (user.role === 'vendor_owner') return true;
  const role = user.staffRole;
  return role === 'Owner' || role === 'Manager';
}

export function branchLabelForType(
  type: string | undefined,
  isSw: boolean,
): string | null {
  if (type === 'main_hq') return isSw ? 'Makao Makuu' : 'HQ';
  if (type === 'warehouse') return isSw ? 'Ghala' : 'Warehouse';
  if (type === 'sub_branch') return isSw ? 'Tawi' : 'Branch';
  return null;
}
