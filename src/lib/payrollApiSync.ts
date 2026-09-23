import { api } from '@/lib/api';
import type { StaffPayrollConfig } from '@/lib/payrollStore';
import type { StaffPayrollFormDraft } from '@/components/v1/hr/StaffPayrollFormFields';
import { staffConfigFromDraft } from '@/components/v1/hr/StaffPayrollFormFields';
import type { PayrollEmployerSettings } from '@/lib/payrollEmployerSettings';

/** Map API contract row → local staffConfig entry. */
export function contractRowToStaffConfig(row: Record<string, unknown>): StaffPayrollConfig {
  const profile = (row.profile as Record<string, unknown>) || {};
  const wage = Number(row.wage_monthly) || Number(profile.baseSalary) || 0;
  return {
    baseSalary: wage || Number(profile.baseSalary) || undefined,
    housingAllowanceMonthly: numOrUndef(profile.housingAllowanceMonthly),
    transportAllowanceMonthly: numOrUndef(profile.transportAllowanceMonthly),
    dailyFoodAllowance: numOrUndef(profile.dailyFoodAllowance),
    dailyTransportAllowance: numOrUndef(profile.dailyTransportAllowance),
    tin: strOrUndef(profile.tin),
    nssfNumber: strOrUndef(profile.nssfNumber),
    nationalId: strOrUndef(profile.nationalId),
    bankName: strOrUndef(profile.bankName),
    bankBranch: strOrUndef(profile.bankBranch),
    bankAccount: strOrUndef(profile.bankAccount),
    hireDate: strOrUndef(profile.hireDate),
    contractType: strOrUndef(profile.contractType),
    department: strOrUndef(profile.department),
    jobTitle: strOrUndef(profile.jobTitle),
    heslb: profile.heslb === true,
    nssfEnabled: row.nssf_enabled !== false && profile.nssfEnabled !== false,
    payeEnabled: row.paye_enabled !== false && profile.payeEnabled !== false,
  };
}

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function strOrUndef(v: unknown): string | undefined {
  const s = String(v ?? '').trim();
  return s || undefined;
}

export function staffConfigToContractPayload(
  staffId: string,
  staffName: string,
  cfg: StaffPayrollConfig,
): Record<string, unknown> {
  const wage = cfg.baseSalary ?? 0;
  return {
    staff_id: staffId,
    staff_name: staffName,
    wage_monthly: wage,
    structure_code: 'standard',
    nssf_enabled: cfg.nssfEnabled !== false,
    paye_enabled: cfg.payeEnabled !== false,
    active: true,
    profile: { ...cfg },
  };
}

export function draftToContractPayload(draft: StaffPayrollFormDraft, staffId: string): Record<string, unknown> {
  return staffConfigToContractPayload(staffId, draft.name, staffConfigFromDraft(draft));
}

export async function fetchPayrollContractsMerged(
  local: Record<string, StaffPayrollConfig>,
): Promise<Record<string, StaffPayrollConfig>> {
  if (!api.hasValidSession()) return local;
  try {
    const rows = await api.getPayrollContracts();
    const merged = { ...local };
    for (const row of rows) {
      const sid = String(row.staff_id || '');
      if (!sid) continue;
      merged[sid] = { ...merged[sid], ...contractRowToStaffConfig(row as Record<string, unknown>) };
    }
    return merged;
  } catch {
    return local;
  }
}

export async function pushPayrollContractToApi(
  staffId: string,
  staffName: string,
  cfg: StaffPayrollConfig,
): Promise<void> {
  if (!api.hasValidSession()) return;
  await api.upsertPayrollContract(staffConfigToContractPayload(staffId, staffName, cfg));
}

export function employerApiToLocal(data: Record<string, unknown>): Partial<PayrollEmployerSettings> {
  return {
    legalName: String(data.legal_name || data.legalName || ''),
    brandShort: String(data.brand_short || data.brandShort || ''),
    brandSubline: String(data.brand_subline || data.brandSubline || ''),
    employerTin: String(data.employer_tin || data.employerTin || ''),
    employerNssfNo: String(data.employer_nssf_no || data.employerNssfNo || ''),
    sealEstYear: String(data.seal_est_year || data.sealEstYear || ''),
    authorizedSignatureDataUrl:
      (data.authorized_signature_data_url as string) || (data.authorizedSignatureDataUrl as string) || undefined,
    signatureCapturedAt: (data.signature_captured_at as string) || undefined,
    signatureCapturedBy: (data.signature_captured_by as string) || undefined,
  };
}

export async function fetchEmployerSettingsFromApi(
  tenantId: string,
  localDefaults: PayrollEmployerSettings,
): Promise<PayrollEmployerSettings> {
  if (!api.hasValidSession()) return localDefaults;
  try {
    const remote = await api.getPayrollEmployerSettings();
    const patch = employerApiToLocal(remote as Record<string, unknown>);
    const next = { ...localDefaults, ...patch };
    const { savePayrollEmployerSettings } = await import('@/lib/payrollEmployerSettings');
    savePayrollEmployerSettings(tenantId, next);
    return next;
  } catch {
    return localDefaults;
  }
}

export async function pushEmployerSettingsToApi(settings: PayrollEmployerSettings): Promise<void> {
  if (!api.hasValidSession()) return;
  await api.savePayrollEmployerSettings({
    legal_name: settings.legalName,
    brand_short: settings.brandShort,
    brand_subline: settings.brandSubline,
    employer_tin: settings.employerTin,
    employer_nssf_no: settings.employerNssfNo,
    seal_est_year: settings.sealEstYear,
    authorized_signature_data_url: settings.authorizedSignatureDataUrl ?? null,
    signature_captured_at: settings.signatureCapturedAt ?? null,
    signature_captured_by: settings.signatureCapturedBy ?? null,
  });
}
