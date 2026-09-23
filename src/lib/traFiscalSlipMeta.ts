import type { EfdApiSettings } from '@/types/traReceipt';
import type { TaxComplianceSettings } from '@/lib/taxComplianceSettings';
import { formatTzMobilePhone } from '@/lib/formatTzPhone';
import type { TraFiscalSlipMeta } from '@/lib/traFiscalSlip';

export function buildTraSlipMeta(
  efd: EfdApiSettings,
  tax: TaxComplianceSettings,
  extras?: { userPhone?: string; datetimeIso?: string },
): TraFiscalSlipMeta {
  return {
    mobile: formatTzMobilePhone(efd.companyMobile || extras?.userPhone),
    taxOffice: efd.taxOffice?.trim() || undefined,
    serialNumber: efd.companySerial || efd.deviceId || tax.traEfdSerial,
    datetimeIso: extras?.datetimeIso,
  };
}
