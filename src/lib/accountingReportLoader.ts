import type { Customer, ExpenseItem, Product, PurchaseOrder, SaleTransaction } from '@/types/v1';
import type { AccountingReportBundle } from '@/lib/accountingApiTypes';
import type { AccountingBooksMode } from '@/lib/accountingDerivedReports';
import {
  buildAgedPayables,
  buildAgedReceivablesFromSales,
  buildBalanceSheet,
  buildIncomeStatement,
  buildWeeklyActivity,
  filterCompletedSales,
} from '@/lib/accountingDerivedReports';
import { api } from '@/lib/api';
import {
  fetchProductsFromApi,
  mapCustomer,
  mapExpense,
  mapPurchaseOrder,
  mapSale,
} from '@/lib/apiSync';

export type AccountingDataSource = 'bundle' | 'operational-api';

export interface LoadAccountingReportsResult {
  bundle: AccountingReportBundle;
  source: AccountingDataSource;
  sales: SaleTransaction[];
  products: Product[];
  customers: Customer[];
  expenses: ExpenseItem[];
  purchaseOrders: PurchaseOrder[];
  notice?: string;
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not found|404/i.test(msg);
}

function journalToLedger(entries: Array<Record<string, unknown>>) {
  const rows: AccountingReportBundle['general_ledger'] = [];
  for (const entry of entries) {
    const lines = (entry.lines as Array<Record<string, unknown>>) || [];
    for (const line of lines) {
      rows.push({
        entry_date: String(entry.entry_date || '').slice(0, 10),
        reference: String(entry.reference || ''),
        account_code: String(line.account_code || ''),
        account_name: String(line.account_name || ''),
        label: String(line.label || ''),
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        source: String(entry.source || 'journal'),
      });
    }
  }
  return rows.slice(-200);
}

function assembleBundleFromOperational(
  booksMode: AccountingBooksMode,
  branchId: string | null | undefined,
  sales: SaleTransaction[],
  products: Product[],
  customers: Customer[],
  expenses: ExpenseItem[],
  purchaseOrders: PurchaseOrder[],
  trialRows: Array<{ code: string; name: string; debit: number; credit: number; balance?: number }>,
  ledgerRows: AccountingReportBundle['general_ledger'],
): AccountingReportBundle {
  const income = buildIncomeStatement(sales, products, expenses, booksMode);
  const balance = buildBalanceSheet(
    sales,
    products,
    customers,
    purchaseOrders,
    booksMode,
    income.netBeforeTax,
  );
  const agedRec = buildAgedReceivablesFromSales(sales, customers);
  const agedPay = buildAgedPayables(purchaseOrders);
  const weekly = buildWeeklyActivity(sales, purchaseOrders);

  return {
    as_of: new Date().toISOString().slice(0, 10),
    books_mode: booksMode,
    branch_id: branchId ?? null,
    income_statement: {
      revenue: income.revenue,
      cogs: income.cogs,
      gross_profit: income.grossProfit,
      operating_expenses: income.operatingExpenses,
      vat_output: income.vatOutput,
      net_before_tax: income.netBeforeTax,
      lines: income.lines.map(l => ({
        key: l.key,
        label_en: l.labelEn,
        label_sw: l.labelSw,
        amount: l.amount,
        section: l.section,
      })),
    },
    balance_sheet: {
      cash: balance.cash,
      receivables: balance.receivables,
      inventory: balance.inventory,
      payables: balance.payables,
      vat_payable: balance.vatPayable,
      equity_estimate: balance.equityEstimate,
      total_assets: balance.totalAssets,
      total_liabilities: balance.totalLiabilities,
    },
    aged_receivables: agedRec,
    aged_payables: agedPay,
    trial_balance: { rows: trialRows },
    general_ledger: ledgerRows,
    weekly_activity: weekly,
    cash_flow: {
      operating: income.netBeforeTax + income.vatOutput * 0.1,
      investing: -balance.inventory * 0.05,
      financing: balance.equityEstimate * 0.02,
      net_change: income.netBeforeTax,
    },
    stats: {
      completed_sales_count: filterCompletedSales(sales).length,
      posted_journal_count: ledgerRows.length > 0 ? ledgerRows.length : undefined,
    },
  };
}

/** Load accounting reports: prefer server bundle; otherwise assemble from live tenant APIs (Railway-safe). */
export async function loadAccountingReports(
  booksMode: AccountingBooksMode,
  branchId?: string | null,
): Promise<LoadAccountingReportsResult> {
  await api.syncAccountingFromOperations(branchId).catch(err => {
    if (!isNotFoundError(err)) throw err;
  });

  try {
    const bundle = await api.getAccountingReportBundle(booksMode, branchId);
    return {
      bundle,
      source: 'bundle',
      sales: [],
      products: [],
      customers: [],
      expenses: [],
      purchaseOrders: [],
    };
  } catch (err) {
    if (!isNotFoundError(err)) throw err;
  }

  const [salesRaw, customersRaw, products, expensesRaw, poRaw, trial, entries] = await Promise.all([
    api.getAllSales(branchId),
    api.getAllCustomers(branchId),
    fetchProductsFromApi(branchId),
    api.getExpenses(branchId),
    api.getPurchaseOrders(branchId),
    api.getTrialBalance(),
    api.getJournalEntries(80),
  ]);

  const sales = (salesRaw as Array<Record<string, unknown>>).map(mapSale);
  const customers = (customersRaw as Array<Record<string, unknown>>).map(mapCustomer);
  const expenses = (expensesRaw as Array<Record<string, unknown>>).map(mapExpense);
  const purchaseOrders = (poRaw as Array<Record<string, unknown>>).map(mapPurchaseOrder);
  const trialRows = (trial.rows || []).map(r => ({
    code: String(r.code),
    name: String(r.name),
    debit: Number(r.debit) || 0,
    credit: Number(r.credit) || 0,
    balance: Number(r.balance) || 0,
  }));
  const ledgerRows = journalToLedger(entries as Array<Record<string, unknown>>);

  const bundle = assembleBundleFromOperational(
    booksMode,
    branchId,
    sales,
    products,
    customers,
    expenses,
    purchaseOrders,
    trialRows,
    ledgerRows,
  );

  return {
    bundle,
    source: 'operational-api',
    sales,
    products,
    customers,
    expenses,
    purchaseOrders,
    notice: 'operational-api',
  };
}
