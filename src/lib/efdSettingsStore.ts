import type { EfdApiSettings } from '@/types/traReceipt';
import { DEFAULT_EFD_API_SETTINGS } from '@/types/traReceipt';

const PREFIX = 'dukamkononi_efd_api_';

export function efdSettingsStorageKey(tenantId?: string | null): string {
  return `${PREFIX}${tenantId || 'default'}`;
}

export function loadEfdApiSettings(tenantId?: string | null): EfdApiSettings {
  try {
    const raw = localStorage.getItem(efdSettingsStorageKey(tenantId));
    if (!raw) return { ...DEFAULT_EFD_API_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<EfdApiSettings> & {
      apiKey?: string;
      apiSecret?: string;
    };
    const merged = { ...DEFAULT_EFD_API_SETTINGS, ...parsed };
    if (!merged.clientId && parsed.apiKey) merged.clientId = parsed.apiKey;
    if (!merged.clientSecret && parsed.apiSecret) merged.clientSecret = parsed.apiSecret;
    if (!merged.apiBaseUrl?.trim()) merged.apiBaseUrl = DEFAULT_EFD_API_SETTINGS.apiBaseUrl;
    return merged;
  } catch {
    return { ...DEFAULT_EFD_API_SETTINGS };
  }
}

export function saveEfdApiSettings(
  tenantId: string | null | undefined,
  settings: EfdApiSettings,
): void {
  const toStore = { ...settings, clientSecret: '' };
  localStorage.setItem(efdSettingsStorageKey(tenantId), JSON.stringify(toStore));
}
