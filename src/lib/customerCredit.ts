import type { Customer } from '@/types/v1';

/** How reliably the customer pays — drives credit limit increase/decrease guidance. */
export type CustomerPunctuality = 'good' | 'watch' | 'poor';

export function customerPaymentPunctuality(c: Customer): CustomerPunctuality {
  const overdue = (c.daysOverdue ?? 0) > 0;
  const stage = c.dunningStage ?? 'cleared';
  if (
    overdue
    || stage === 'stage3_call'
    || stage === 'stage4_final'
    || stage === 'stage5_legal'
  ) {
    return 'poor';
  }
  const limit = c.creditLimit || 1;
  const usage = (c.balance ?? 0) / limit;
  if (usage >= 0.85) return 'watch';
  return 'good';
}

export function canIncreaseCreditLimit(c: Customer): boolean {
  return customerPaymentPunctuality(c) !== 'poor';
}

export function punctualityHint(c: Customer, isSw: boolean): string {
  const p = customerPaymentPunctuality(c);
  if (p === 'good') {
    return isSw
      ? 'Malipo kwa wakati — unaweza kuongeza kikomo kidogo.'
      : 'Pays on time — you may increase the limit.';
  }
  if (p === 'watch') {
    return isSw
      ? 'Deni limekaribia kikomo — ongeza tu ikiwa amelipa sehemu ya deni.'
      : 'Balance is high — increase only if they have paid down debt.';
  }
  return isSw
    ? 'Malipo yamechelewa — punguza kikomo au kusanya deni kwanza.'
    : 'Payments overdue — lower the limit or collect debt first.';
}

export function formatCreditLimitDelta(delta: number, isSw: boolean): string {
  const abs = Math.abs(delta);
  const label = abs >= 1_000_000
    ? `${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`
    : `${Math.round(abs / 1000)}k`;
  const sign = delta >= 0 ? '+' : '−';
  return isSw ? `${sign}${label} TSh` : `${sign}${label} TSh`;
}
