import type { EfdApiSettings, TraEfdCustomerIdTypeCode } from '@/types/traReceipt';
import { DEFAULT_EFD_API_BASE, DEFAULT_EFD_API_SETTINGS } from '@/types/traReceipt';

export function mapApiTraConfigToSettings(raw: Record<string, unknown>): EfdApiSettings {
  const status = String(raw.connection_status || 'not_tested') as EfdApiSettings['connectionStatus'];
  return {
    ...DEFAULT_EFD_API_SETTINGS,
    enabled: Boolean(raw.active ?? raw.enabled ?? false),
    apiBaseUrl: String(raw.api_base_url || DEFAULT_EFD_API_BASE),
    clientId: String(raw.client_id || ''),
    clientSecret: '',
    hasClientSecret: Boolean(raw.has_client_secret),
    companyCity: String(raw.company_city || ''),
    companyMobile: String(raw.company_mobile || ''),
    defaultCustomerIdType: String(raw.default_id_type || '6') as TraEfdCustomerIdTypeCode,
    demoMode: Boolean(raw.is_demo ?? raw.demo_mode ?? false),
    connectionStatus: status,
    companyVrn: String(raw.company_vrn || ''),
    companyTin: String(raw.company_tin || ''),
    companySerial: String(raw.company_serial || ''),
    companyVin: String(raw.company_vin || ''),
    taxOffice: String(raw.tax_office || ''),
    tokenUserName: String(raw.token_user_name || ''),
    tokenEmail: String(raw.token_email || ''),
    lastConnection: raw.last_connection ? String(raw.last_connection) : undefined,
    zNumber: String(raw.company_serial || ''),
  };
}

export function settingsToTraConfigApi(
  settings: EfdApiSettings,
  includeSecret: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    active: settings.enabled,
    api_base_url: settings.apiBaseUrl,
    client_id: settings.clientId,
    company_city: settings.companyCity,
    company_mobile: settings.companyMobile,
    default_id_type: settings.defaultCustomerIdType,
    is_demo: settings.demoMode,
  };
  if (includeSecret && settings.clientSecret.trim()) {
    body.client_secret = settings.clientSecret.trim();
  }
  return body;
}

export function traCustomerIdTypeToCode(type?: string): TraEfdCustomerIdTypeCode {
  const key = (type || '').toLowerCase();
  if (key === 'tin') return '1';
  if (key.includes('driving')) return '2';
  if (key.includes('voter')) return '3';
  if (key === 'passport') return '4';
  if (key === 'nida') return '5';
  return '6';
}
