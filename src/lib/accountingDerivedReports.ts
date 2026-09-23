import type { Customer, ExpenseItem, Product, PurchaseOrder, SaleTransaction } from '@/types/v1';
import { computeTotalCOGS, computeTotalRevenue } from '@/lib/analyticsCompute';

export type AccountingBooksMode = 'standard' | 'tra';

const COMPLETED = new Set([
  'completed',
  'pending_credit',
  'ready_to_complete',
]);

export function filterCompletedSales(sales: SaleTransaction[]): SaleTransaction[] {
  return sales.filter(s => COMPLETED.has(s.status));
}

export function sumVatCollected(sales: SaleTransaction[]): number {
  return filterCompletedSales(sales).reduce((a, s) => a + (Number(s.vatAmount) || 0), 0);
}

export function inventoryBookValue(products: Product[]): number {
  return products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.cost) || 0), 0);
}

export function accountsReceivableTotal(customers: Customer[]): number {
  return customers.reduce((a, c) => a + Math.max(0, Number(c.balance) || 0), 0);
}

export function accountsPayableFromPOs(orders: PurchaseOrder[]): number {
  return orders.reduce((a, po) => {
    const owed = Math.max(0, (Number(po.totalAmount) || 0) - (Number(po.paidAmount) || 0));
    return a + owed;
  }, 0);
}

export function cashFromSalesEstimate(sales: SaleTransaction[]): number {
  return filterCompletedSales(sales).reduce((a, s) => a + (Number(s.paidAmount) || 0), 0);
}

export function expenseTotal(expenses: ExpenseItem[]): number {
  return expenses.filter(e => e.status !== 'pending').reduce((a, e) => a + (Number(e.amount) || 0), 0);
}

export interface WeeklyBucket {
  label: string;
  revenue: number;
  bills: number;
  vat: number;
}

/** Last 8 ISO weeks for Odoo-style spark bars. */
export function buildWeeklyActivity(
  sales: SaleTransaction[],
  purchaseOrders: PurchaseOrder[],
): WeeklyBucket[] {
  const now = new Date();
  const buckets: WeeklyBucket[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const label = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    const inRange = (d: string) => {
      const dt = new Date(d.slice(0, 10));
      return dt >= start && dt <= end;
    };
    const weekSales = filterCompletedSales(sales).filter(s => inRange(s.date));
    const weekPO = purchaseOrders.filter(po => inRange(po.dateCreated || po.expectedDate || ''));
    buckets.push({
      label,
      revenue: weekSales.reduce((a, s) => a + s.total, 0),
      bills: weekPO.reduce((a, po) => a + (Number(po.totalAmount) || 0), 0),
      vat: weekSales.reduce((a, s) => a + (Number(s.vatAmount) || 0), 0),
    });
  }
  return buckets;
}

export interface IncomeStatementModel {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  vatOutput: number;
  netBeforeTax: number;
  lines: Array<{ key: string; labelEn: string; labelSw: string; amount: number; section: string }>;
}

export function buildIncomeStatement(
  sales: SaleTransaction[],
  products: Product[],
  expenses: ExpenseItem[],
  mode: AccountingBooksMode,
): IncomeStatementModel {
  const revenue = computeTotalRevenue(filterCompletedSales(sales));
  const cogs = computeTotalCOGS(filterCompletedSales(sales), products);
  const operatingExpenses = expenseTotal(expenses);
  const vatOutput = mode === 'tra' ? sumVatCollected(sales) : 0;
  const grossProfit = revenue - cogs;
  const netBeforeTax = grossProfit - operatingExpenses;

  const lines: IncomeStatementModel['lines'] = [
    { key: 'rev', labelEn: 'Sales revenue', labelSw: 'Mapato ya mauzo', amount: revenue, section: 'revenue' },
    { key: 'cogs', labelEn: 'Cost of goods sold', labelSw: 'Gharama ya bidhaa', amount: cogs, section: 'cogs' },
    { key: 'gross', labelEn: 'Gross profit', labelSw: 'Faida jumla', amount: grossProfit, section: 'subtotal' },
    { key: 'opex', labelEn: 'Operating expenses', labelSw: 'Matumizi ya uendeshaji', amount: operatingExpenses, section: 'opex' },
  ];
  if (mode === 'tra') {
    lines.push({
      key: 'vat',
      labelEn: 'Output VAT (TRA / EFD)',
      labelSw: 'VAT ya mauzo (TRA / EFD)',
      amount: vatOutput,
      section: 'tax',
    });
  }
  lines.push({
    key: 'net',
    labelEn: 'Net result (operating)',
    labelSw: 'Matokeo halisi',
    amount: netBeforeTax,
    section: 'total',
  });

  return { revenue, cogs, grossProfit, operatingExpenses, vatOutput, netBeforeTax, lines };
}

export interface BalanceSheetModel {
  cash: number;
  receivables: number;
  inventory: number;
  payables: number;
  vatPayable: number;
  equityEstimate: number;
  totalAssets: number;
  totalLiabilities: number;
}

export function buildBalanceSheet(
  sales: SaleTransaction[],
  products: Product[],
  customers: Customer[],
  purchaseOrders: PurchaseOrder[],
  mode: AccountingBooksMode,
  netIncome: number,
): BalanceSheetModel {
  const cash = cashFromSalesEstimate(sales) * 0.35;
  const receivables = accountsReceivableTotal(customers);
  const inventory = inventoryBookValue(products);
  const payables = accountsPayableFromPOs(purchaseOrders);
  const vatPayable = mode === 'tra' ? sumVatCollected(sales) * 0.85 : 0;
  const totalAssets = cash + receivables + inventory;
  const totalLiabilities = payables + vatPayable;
  const equityEstimate = totalAssets - totalLiabilities + netIncome * 0.5;

  return {
    cash,
    receivables,
    inventory,
    payables,
    vatPayable,
    equityEstimate,
    totalAssets,
    totalLiabilities,
  };
}

export interface AgingRow {
  name: string;
  current: number;
  d30: number;
  d60: number;
  d90: number;
  d90plus: number;
  total: number;
  flag?: 'overdue' | 'due_soon';
}

function bucketAgingAmount(row: AgingRow, amount: number, days: number) {
  if (days <= 0) row.current += amount;
  else if (days <= 30) row.d30 += amount;
  else if (days <= 60) row.d60 += amount;
  else if (days <= 90) row.d90 += amount;
  else row.d90plus += amount;
  row.total += amount;
  if (days > 60) row.flag = 'overdue';
  else if (days > 0 && row.flag !== 'overdue') row.flag = 'due_soon';
}

/** Merge duplicate customer names (multiple CRM rows) into one aging line. */
export function mergeAgingRowsByName(rows: AgingRow[]): AgingRow[] {
  const byName = new Map<string, AgingRow>();
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...r });
      continue;
    }
    existing.current += r.current;
    existing.d30 += r.d30;
    existing.d60 += r.d60;
    existing.d90 += r.d90;
    existing.d90plus += r.d90plus;
    existing.total += r.total;
    if (r.flag === 'overdue') existing.flag = 'overdue';
    else if (r.flag === 'due_soon' && existing.flag !== 'overdue') existing.flag = 'due_soon';
  }
  return Array.from(byName.values()).sort((a, b) => b.total - a.total);
}

export function buildAgedReceivables(customers: Customer[]): AgingRow[] {
  const rows = customers
    .filter(c => (Number(c.balance) || 0) > 0)
    .map(c => {
      const total = Number(c.balance) || 0;
      const days = Number(c.daysOverdue) || 0;
      const row: AgingRow = {
        name: c.name,
        current: 0,
        d30: 0,
        d60: 0,
        d90: 0,
        d90plus: 0,
        total: 0,
      };
      bucketAgingAmount(row, total, days);
      return row;
    });
  return mergeAgingRowsByName(rows);
}

/** Age open balances from credit/partial POS sales (live API data). */
export function buildAgedReceivablesFromSales(
  sales: SaleTransaction[],
  customers: Customer[],
): AgingRow[] {
  const byKey = new Map<string, AgingRow>();
  const now = Date.now();

  for (const s of filterCompletedSales(sales)) {
    const owed = Math.max(
      0,
      Number(s.balanceRemaining) ||
        Math.max(0, (Number(s.total) || 0) - (Number(s.paidAmount) || 0)),
    );
    if (owed <= 0) continue;
    const name = (s.customerName || 'Customer').trim();
    const key = (s.customerId || name).toLowerCase();
    const row =
      byKey.get(key) ||
      ({
        name,
        current: 0,
        d30: 0,
        d60: 0,
        d90: 0,
        d90plus: 0,
        total: 0,
      } satisfies AgingRow);
    const rawDate = s.date || (s as { createdAt?: string }).createdAt || '';
    const saleTime = rawDate ? new Date(rawDate.slice(0, 10)).getTime() : now;
    const days = Math.floor((now - saleTime) / 86400000);
    bucketAgingAmount(row, owed, days);
    byKey.set(key, row);
  }

  if (byKey.size > 0) {
    return mergeAgingRowsByName(Array.from(byKey.values()));
  }
  return buildAgedReceivables(customers);
}

export function buildAgedPayables(orders: PurchaseOrder[]): AgingRow[] {
  const bySupplier = new Map<string, AgingRow>();
  for (const po of orders) {
    const owed = Math.max(0, (Number(po.totalAmount) || 0) - (Number(po.paidAmount) || 0));
    if (owed <= 0) continue;
    const name = po.supplierName || 'Supplier';
    const row = bySupplier.get(name) || {
      name,
      current: 0,
      d30: 0,
      d60: 0,
      d90: 0,
      d90plus: 0,
      total: 0,
    };
    const expected = po.expectedDate ? new Date(po.expectedDate) : new Date();
    const days = Math.floor((Date.now() - expected.getTime()) / 86400000);
    if (days <= 0) row.current += owed;
    else if (days <= 30) row.d30 += owed;
    else if (days <= 60) row.d60 += owed;
    else if (days <= 90) row.d90 += owed;
    else row.d90plus += owed;
    row.total += owed;
    if (days > 90) row.flag = 'overdue';
    else if (days > 0 && days <= 7) row.flag = 'due_soon';
    bySupplier.set(name, row);
  }
  return Array.from(bySupplier.values()).sort((a, b) => b.total - a.total);
}

export function countPendingCustomerInvoices(sales: SaleTransaction[]): number {
  return sales.filter(
    s => s.status === 'pending_completion' || s.status === 'requires_attention' || s.balanceRemaining > 0,
  ).length;
}

export function countVendorBillsDue(orders: PurchaseOrder[]): { draft: number; toPay: number; pending: number } {
  const draft = orders.filter(p => p.status === 'draft').length;
  const pending = orders.filter(p => p.status === 'sent' || (p.status as string) === 'pending').length;
  const toPay = orders.filter(p => {
    const owed = Math.max(0, (Number(p.totalAmount) || 0) - (Number(p.paidAmount) || 0));
    return owed > 0 && p.status !== 'draft';
  }).length;
  return { draft, toPay, pending };
}
