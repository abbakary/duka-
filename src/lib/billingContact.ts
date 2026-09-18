/** Provider-controlled billing contact + free trial defaults (synced from API). */

export interface PlatformBillingSettings {
  trialDays: number;
  graceDays: number;
  lipaNumber: string;
  lipaName: string;
  whatsappNumber: string;
  supportNoteEn: string;
  supportNoteSw: string;
}

export const DEFAULT_BILLING_SETTINGS: PlatformBillingSettings = {
  trialDays: 14,
  graceDays: 0,
  lipaNumber: '0650124656',
  lipaName: 'DUKAPLUS',
  whatsappNumber: '0650124656',
  supportNoteEn:
    'After payment, send your business name + M-Pesa reference on WhatsApp for activation.',
  supportNoteSw:
    'Baada ya malipo, tuma jina la biashara + kumbukumbu ya M-Pesa kwenye WhatsApp ili kuamilisha.',
};

export function mapBillingSettings(raw: Record<string, unknown> | null | undefined): PlatformBillingSettings {
  if (!raw) return { ...DEFAULT_BILLING_SETTINGS };
  return {
    trialDays: Number(raw.trial_days ?? raw.trialDays ?? 14) || 14,
    graceDays: Number(raw.grace_days ?? raw.graceDays ?? 0) || 0,
    lipaNumber: String(raw.lipa_number ?? raw.lipaNumber ?? DEFAULT_BILLING_SETTINGS.lipaNumber),
    lipaName: String(raw.lipa_name ?? raw.lipaName ?? DEFAULT_BILLING_SETTINGS.lipaName),
    whatsappNumber: String(raw.whatsapp_number ?? raw.whatsappNumber ?? DEFAULT_BILLING_SETTINGS.whatsappNumber),
    supportNoteEn: String(raw.support_note_en ?? raw.supportNoteEn ?? DEFAULT_BILLING_SETTINGS.supportNoteEn),
    supportNoteSw: String(raw.support_note_sw ?? raw.supportNoteSw ?? DEFAULT_BILLING_SETTINGS.supportNoteSw),
  };
}

/** Normalize TZ mobile to wa.me format (255…). */
export function whatsappMeLink(phone: string, presetMessage?: string): string {
  const digits = phone.replace(/\D/g, '');
  let intl = digits;
  if (digits.startsWith('0') && digits.length === 10) intl = `255${digits.slice(1)}`;
  else if (digits.startsWith('255')) intl = digits;
  else if (digits.length === 9) intl = `255${digits}`;
  const base = `https://wa.me/${intl}`;
  if (presetMessage) return `${base}?text=${encodeURIComponent(presetMessage)}`;
  return base;
}

export function billingWhatsAppMessage(isSw: boolean, businessName?: string): string {
  const name = businessName || (isSw ? 'Biashara yangu' : 'My business');
  return isSw
    ? `Habari Duka+ Support. Naitwa / biashara: ${name}. Nahitaji kuongeza / kulipia kifurushi.`
    : `Hello Duka+ Support. Business: ${name}. I need to upgrade / pay for a subscription package.`;
}
