/** Shape of GET /tenant/accounting/reports/bundle */

export interface AccountingReportBundle {
  as_of: string;
  books_mode: string;
  branch_id?: string | null;
  income_statement: {
    revenue: number;
    cogs: number;
    gross_profit: number;
    operating_expenses: number;
    vat_output: number;
    net_before_tax: number;
    lines: Array<{
      key: string;
      label_en: string;
      label_sw: string;
      amount: number;
      section: string;
    }>;
  };
  balance_sheet: {
    cash: number;
    receivables: number;
    inventory: number;
    payables: number;
    vat_payable: number;
    equity_estimate: number;
    total_assets: number;
    total_liabilities: number;
  };
  aged_receivables: Array<{
    name: string;
    current: number;
    d30: number;
    d60: number;
    d90: number;
    d90plus: number;
    total: number;
    flag?: string | null;
  }>;
  aged_payables: Array<{
    name: string;
    current: number;
    d30: number;
    d60: number;
    d90: number;
    d90plus: number;
    total: number;
    flag?: string | null;
  }>;
  trial_balance: { rows: Array<{ code: string; name: string; debit: number; credit: number; balance?: number }> };
  general_ledger: Array<{
    entry_date: string;
    reference: string;
    account_code: string;
    account_name: string;
    label: string;
    debit: number;
    credit: number;
    source: string;
  }>;
  weekly_activity: Array<{ label: string; revenue: number; bills: number; vat: number }>;
  cash_flow: { operating: number; investing: number; financing: number; net_change: number };
  stats?: { posted_journal_count?: number; completed_sales_count?: number };
}
