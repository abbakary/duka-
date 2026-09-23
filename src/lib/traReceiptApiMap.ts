import type { TraReceipt, TraReceiptItem, TraReceiptStatus } from '@/types/traReceipt';

function mapItems(raw: unknown): TraReceiptItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(it => {
    const row = it as Record<string, unknown>;
    const total = Number(row.amount ?? row.total) || 0;
    const tax = Number(row.tax ?? row.vatAmount) || 0;
    return {
      productName: String(row.itemdesc ?? row.productName ?? 'Item'),
      quantity: Number(row.itemqty ?? row.quantity) || 1,
      unitPrice: Number(row.unit_price ?? row.unitPrice) || 0,
      vatAmount: tax,
      total,
    };
  });
}

export function mapFiscalRecordToTraReceipt(raw: Record<string, unknown>): TraReceipt {
  const created = String(raw.created_at ?? new Date().toISOString());
  const datePart = created.slice(0, 10);
  const rawStatus = String(raw.status ?? 'pending').toLowerCase();
  const isDemo = Boolean(raw.is_demo) || rawStatus === 'demo';
  let status: TraReceiptStatus = 'pending';
  if (rawStatus === 'failed') status = 'failed';
  else if (rawStatus === 'success') status = 'success';
  else if (isDemo) status = 'demo';
  else if (raw.verification_code) status = 'success';

  return {
    id: String(raw.id),
    receiptNumber: String(raw.receipt_number || raw.invoice_reference || raw.id),
    verificationCode: String(raw.verification_code ?? ''),
    receiptDate: datePart,
    receiptTime: created.length >= 19 ? created.slice(11, 19) : '12:00:00',
    zNumber: String(raw.z_number ?? ''),
    vrn: String(raw.vrn ?? ''),
    verificationLink: String(raw.verify_link ?? ''),
    source: 'pos_order',
    companyName: '',
    invoiceReference: String(raw.invoice_reference ?? ''),
    invoiceDate: datePart,
    saleId: raw.sale_id ? String(raw.sale_id) : undefined,
    posOrderId: raw.sale_id ? String(raw.sale_id) : undefined,
    customerName: String(raw.customer_name ?? 'Walk-in Customer'),
    customerIdType: 'None',
    customerIdNumber: '',
    customerMobile: '',
    totalExclTax: Number(raw.total_excl_tax) || 0,
    totalVat: Number(raw.total_tax) || 0,
    totalInclTax: Number(raw.total_incl_tax) || 0,
    status,
    isDemo,
    items: mapItems(raw.items),
    apiResponse: raw.error_message ? String(raw.error_message) : undefined,
    branchId: raw.branch_id ? String(raw.branch_id) : undefined,
    createdAt: created,
  };
}

export function mergeTraReceiptLists(local: TraReceipt[], fromApi: TraReceipt[]): TraReceipt[] {
  const seen = new Set<string>();
  const out: TraReceipt[] = [];
  const push = (r: TraReceipt) => {
    const keys = [r.id, r.invoiceReference, r.receiptNumber].filter(Boolean) as string[];
    if (!keys.length || keys.some(k => seen.has(k))) return;
    keys.forEach(k => seen.add(k));
    out.push(r);
  };
  for (const r of fromApi) push(r);
  for (const r of local) push(r);
  out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return out;
}

export function isIssuedTraReceipt(r: TraReceipt): boolean {
  return (
    r.status === 'success' ||
    r.status === 'demo' ||
    Boolean(r.verificationCode && r.verificationCode !== '—')
  );
}
