import type { ExpenseItem, Product, SaleTransaction } from '@/types/v1';

export type FinancialPeriod = 'month' | 'quarter' | 'year' | 'all';

/** Sale statuses excluded from revenue, COGS, and P&L (matches backend analytics). */
const EXCLUDED_SALE_STATUSES = new Set([
  'cancelled',
  'voided',
  'refunded',
  'open',
  'pending_completion',
  'requires_attention',
]);

export function productUnitCost(p: Product): number {
  return Number(p.cost ?? (p as { buyingPrice?: number }).buyingPrice ?? 0) || 0;
}

export function saleLocalYmd(date: string): string {
  const raw = String(date || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return raw.slice(0, 10);
  }
  const t = Date.parse(raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw);
  if (Number.isNaN(t)) return raw.slice(0, 10);
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function saleLocalDate(date: string): Date {
  const ymd = saleLocalYmd(date);
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function isFinancialSale(s: SaleTransaction): boolean {
  const st = String(s.status || 'completed').toLowerCase();
  return !EXCLUDED_SALE_STATUSES.has(st);
}

export function filterSalesForFinancialMetrics(sales: SaleTransaction[]): SaleTransaction[] {
  return sales.filter(isFinancialSale);
}

export function periodStartLocal(range: FinancialPeriod, ref = new Date()): Date | null {
  if (range === 'all') return null;
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  if (range === 'month') {
    d.setDate(1);
    return d;
  }
  if (range === 'quarter') {
    d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
    return d;
  }
  d.setMonth(0, 1);
  return d;
}

export function filterSalesByPeriod(
  sales: SaleTransaction[],
  range: FinancialPeriod,
  ref = new Date(),
): SaleTransaction[] {
  const start = periodStartLocal(range, ref);
  const base = filterSalesForFinancialMetrics(sales);
  if (!start) return base;
  const startMs = start.getTime();
  return base.filter(s => {
    const sd = saleLocalDate(s.date);
    return !Number.isNaN(sd.getTime()) && sd.getTime() >= startMs;
  });
}

export function filterExpensesByPeriod(
  expenses: ExpenseItem[],
  range: FinancialPeriod,
  ref = new Date(),
): ExpenseItem[] {
  if (range === 'all') return expenses;
  const start = periodStartLocal(range, ref);
  if (!start) return expenses;
  const startMs = start.getTime();
  return expenses.filter(e => {
    const d = saleLocalDate(String(e.date || '').slice(0, 10));
    return !Number.isNaN(d.getTime()) && d.getTime() >= startMs;
  });
}

export interface ProfitLossSnapshot {
  grossSales: number;
  cogs: number;
  grossProfit: number;
  totalOpex: number;
  netProfit: number;
  grossMarginPercent: number;
  netMarginPercent: number;
}

export function computeProfitLossSnapshot(
  sales: SaleTransaction[],
  products: Product[],
  expenses: ExpenseItem[],
  range: FinancialPeriod = 'month',
): ProfitLossSnapshot {
  const scopedSales = filterSalesByPeriod(sales, range);
  const scopedExpenses = filterExpensesByPeriod(expenses, range);
  const costById = new Map(products.map(p => [p.id, productUnitCost(p)]));

  const grossSales = scopedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const cogs = scopedSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      return itemSum + (costById.get(item.productId) ?? 0) * item.quantity;
    }, 0);
  }, 0);
  const totalOpex = scopedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const grossProfit = grossSales - cogs;
  const netProfit = grossProfit - totalOpex;

  return {
    grossSales,
    cogs,
    grossProfit,
    totalOpex,
    netProfit,
    grossMarginPercent: grossSales > 0 ? Math.round((grossProfit / grossSales) * 1000) / 10 : 0,
    netMarginPercent: grossSales > 0 ? Math.round((netProfit / grossSales) * 1000) / 10 : 0,
  };
}

export function mapAnalyticsSnapshotPl(raw: Record<string, unknown>): ProfitLossSnapshot {
  const grossSales = Number(raw.gross_sales ?? 0);
  const cogs = Number(raw.cogs ?? 0);
  const grossProfit = Number(raw.gross_margin ?? grossSales - cogs);
  const totalOpex = Number(raw.total_opex ?? 0);
  const netProfit = Number(raw.net_profit ?? grossProfit - totalOpex);
  return {
    grossSales,
    cogs,
    grossProfit,
    totalOpex,
    netProfit,
    grossMarginPercent: grossSales > 0 ? Math.round((grossProfit / grossSales) * 1000) / 10 : 0,
    netMarginPercent: grossSales > 0 ? Math.round((netProfit / grossSales) * 1000) / 10 : 0,
  };
}
