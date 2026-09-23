/** Normalize Tanzania mobile numbers for receipts (+255 7XX XXX XXX). */
export function formatTzMobilePhone(raw?: string | null): string {
  if (!raw || !String(raw).trim()) return 'N/A';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return 'N/A';

  let national = digits;
  if (national.startsWith('255')) {
    national = national.slice(3);
  } else if (national.startsWith('0') && national.length >= 10) {
    national = national.slice(1);
  }
  if (national.length > 9) {
    national = national.slice(-9);
  }
  if (national.length === 9) {
    return `+255${national}`;
  }
  return String(raw).trim();
}
