import type { AuthUser, BusinessType, StoreBranch } from '@/types/v1';
import type { ReportCompanyInfo } from '@/lib/standardReports';

const BUSINESS_TYPE_LABEL: Record<BusinessType, { en: string; sw: string }> = {
  pharmacy: { en: 'Pharmacy & health', sw: 'Dawa na afya' },
  retail: { en: 'Retail & grocery', sw: 'Rejareja' },
  hardware: { en: 'Hardware & building', sw: 'Vifaa vya ujenzi' },
  restaurant: { en: 'Restaurant & café', sw: 'Mgahawa' },
  service: { en: 'Services & salon', sw: 'Huduma' },
};

export function formatBusinessTypeForReport(type?: BusinessType, isSw = false): string | undefined {
  if (!type) return undefined;
  const row = BUSINESS_TYPE_LABEL[type];
  return row ? (isSw ? row.sw : row.en) : type;
}

/** Physical location line for A4 — never use branch code as the only address. */
export function formatBranchLocationLine(branch?: StoreBranch | null): string | undefined {
  if (!branch) return undefined;
  const code = branch.code?.trim().toLowerCase();
  const addr = branch.address?.trim();
  const useAddr = addr && (!code || addr.toLowerCase() !== code) ? addr : '';
  const parts = [useAddr, branch.district?.trim(), branch.region?.trim()].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

export interface ReportBrandingLike {
  companyName?: string;
  address?: string;
  phone?: string;
  tinNumber?: string;
  logoUrl?: string;
}

export function buildReportCompanyInfo(opts: {
  isSw?: boolean;
  currentUser?: AuthUser | null;
  branding?: ReportBrandingLike;
  activeBranch?: StoreBranch | null;
  activeBranchName?: string | null;
}): ReportCompanyInfo {
  const { isSw = false, currentUser, branding, activeBranch, activeBranchName } = opts;
  const branch = activeBranch ?? null;
  const branchName = branch?.name || activeBranchName?.trim() || undefined;
  const location = formatBranchLocationLine(branch) || branding?.address || currentUser?.location;

  return {
    businessName: branding?.companyName || currentUser?.businessName || 'Duka+ Business',
    ownerName: branch?.managerName || currentUser?.name,
    address: location,
    phone: branch?.phone?.trim() || branding?.phone || currentUser?.phone,
    email: branch?.email?.trim() || currentUser?.email,
    tinNumber: branding?.tinNumber || currentUser?.tinNumber,
    branch: branchName,
    branchCode: branch?.code?.trim() || undefined,
    branchManager: branch?.managerName?.trim() || undefined,
    logoUrl: branding?.logoUrl || undefined,
    businessType: formatBusinessTypeForReport(currentUser?.businessType, isSw),
  };
}
