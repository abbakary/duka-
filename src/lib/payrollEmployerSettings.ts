/** Employer identifiers and payslip branding (per tenant, local + API sync later). */

export interface PayrollEmployerSettings {
  legalName: string;
  brandShort: string;
  brandSubline: string;
  employerTin: string;
  employerNssfNo: string;
  sealEstYear?: string;
  authorizedSignatureDataUrl?: string;
  signatureCapturedAt?: string;
  signatureCapturedBy?: string;
}

const DEFAULT: PayrollEmployerSettings = {
  legalName: 'Jengo Mega Hardware & Builders Ltd',
  brandShort: 'JENGO MEGA',
  brandSubline: 'Hardware & Builders — Dar es Salaam',
  employerTin: '108-905-330',
  employerNssfNo: 'TZ-NSSF-EMP-55021',
  sealEstYear: '2011',
};

function key(tenantId: string): string {
  return `dukamkononi_payroll_employer_${tenantId}`;
}

export function loadPayrollEmployerSettings(tenantId: string): PayrollEmployerSettings {
  try {
    const raw = localStorage.getItem(key(tenantId));
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function savePayrollEmployerSettings(tenantId: string, data: PayrollEmployerSettings): void {
  localStorage.setItem(key(tenantId), JSON.stringify(data));
}

export function mergeEmployerFromBusiness(
  tenantId: string,
  businessName?: string,
  tin?: string,
): PayrollEmployerSettings {
  const cur = loadPayrollEmployerSettings(tenantId);
  if (!businessName?.trim()) return cur;
  const short = businessName.split(/\s+/).slice(0, 2).join(' ').toUpperCase().slice(0, 24) || cur.brandShort;
  return {
    ...cur,
    legalName: businessName.includes('Ltd') ? businessName : `${businessName} Ltd`,
    brandShort: short,
    brandSubline: cur.brandSubline || 'Dar es Salaam',
    employerTin: tin?.trim() || cur.employerTin,
  };
}
