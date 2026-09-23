import { formatTSh } from '@/utils/translations';
import type { TraReceipt } from '@/types/traReceipt';
import type { EfdApiSettings } from '@/types/traReceipt';
import type { TaxComplianceSettings } from '@/lib/taxComplianceSettings';
import { wrapReportPaper } from '@/lib/reportPaperHtml';

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function money(n: number): string {
  return formatTSh(Math.round(n));
}

export interface TraFiscalReportMeta {
  businessName: string;
  tinNumber?: string;
  vrnNumber?: string;
  address?: string;
  phone?: string;
  ownerName?: string;
  branch?: string;
  periodFrom: string;
  periodTo: string;
  efdSerial?: string;
  taxOffice?: string;
}

function statusLabel(r: TraReceipt, isSw: boolean): string {
  if (r.isDemo || r.status === 'demo') return isSw ? 'Demo / majaribio' : 'Demo / sandbox';
  if (r.status === 'success') return isSw ? 'Imefanikiwa' : 'Success';
  if (r.status === 'failed') return isSw ? 'Imeshindwa' : 'Failed';
  return isSw ? 'Inasubiri' : 'Pending';
}

export function renderTraFiscalReportPaper(
  receipts: TraReceipt[],
  meta: TraFiscalReportMeta,
  isSw: boolean,
): string {
  const issued = receipts.filter(r => {
    const d = r.receiptDate || r.createdAt.slice(0, 10);
    return d >= meta.periodFrom && d <= meta.periodTo;
  });

  const totalNet = issued.reduce((s, r) => s + r.totalExclTax, 0);
  const totalVat = issued.reduce((s, r) => s + r.totalVat, 0);
  const totalGross = issued.reduce((s, r) => s + r.totalInclTax, 0);
  const successCount = issued.filter(r => r.status === 'success' || (r.isDemo && r.verificationCode)).length;
  const failedCount = issued.filter(r => r.status === 'failed').length;

  const headers = isSw
    ? ['#', 'Risiti', 'Tarehe', 'Mteja', 'VRN', 'Z', 'Uthibitisho', 'Neto', 'VAT', 'Jumla', 'Hali']
    : ['#', 'Receipt', 'Date', 'Customer', 'VRN', 'Z', 'Verification', 'Net', 'VAT', 'Gross', 'Status'];

  const rows = issued.map((r, i) => [
    String(i + 1),
    esc(r.receiptNumber),
    `${esc(r.receiptDate)}<div style="font-size:8px;color:#6B7280">${esc(r.receiptTime)}</div>`,
    esc(r.customerName),
    esc(r.vrn || meta.vrnNumber || '—'),
    esc(r.zNumber || meta.efdSerial || '—'),
    `<span style="font-family:monospace;font-size:9px">${esc(r.verificationCode || '—')}</span>`,
    money(r.totalExclTax),
    money(r.totalVat),
    money(r.totalInclTax),
    esc(statusLabel(r, isSw)),
  ]);

  const itemRows: string[][] = [];
  issued.forEach((r, ri) => {
    r.items.forEach(it => {
      itemRows.push([
        String(ri + 1),
        esc(r.receiptNumber),
        esc(it.productName),
        String(it.quantity),
        money(it.vatAmount),
        money(it.total),
      ]);
    });
  });

  const kpi = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
      ${[
        { l: isSw ? 'Risiti' : 'Receipts', v: String(issued.length) },
        { l: isSw ? 'Zilizotolewa' : 'Issued', v: String(successCount) },
        { l: isSw ? 'Zilizoshindwa' : 'Failed', v: String(failedCount) },
        { l: isSw ? 'Jumla VAT' : 'Total VAT', v: money(totalVat) },
        { l: isSw ? 'Jumla mauzo' : 'Gross sales', v: money(totalGross) },
      ]
        .map(
          k => `<div style="flex:1;min-width:100px;border:1px solid #E5E7EB;border-radius:6px;padding:8px;background:#F9FAFB">
        <div style="font-size:8px;font-weight:700;color:#6B7280;text-transform:uppercase">${esc(k.l)}</div>
        <div style="font-size:12px;font-weight:800;margin-top:2px">${esc(k.v)}</div>
      </div>`,
        )
        .join('')}
    </div>`;

  const table = (title: string, hdrs: string[], body: string[][], empty: string) => {
    if (!body.length) {
      return `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;margin-bottom:6px">${esc(title)}</div>
        <div style="border:1px dashed #D1D5DB;padding:16px;text-align:center;color:#6B7280;font-size:11px">${esc(empty)}</div></div>`;
    }
    const head = hdrs.map(h => `<th style="background:#F3F4F6;border:1px solid #E5E7EB;padding:5px 6px;font-size:8px;text-transform:uppercase">${esc(h)}</th>`).join('');
    const tbody = body
      .map(
        (r, i) =>
          `<tr>${r
            .map(
              (c, ci) =>
                `<td style="border:1px solid #E5E7EB;padding:5px 6px;font-size:9px;background:${i % 2 ? '#FAFAFA' : '#fff'};${ci >= 7 ? 'text-align:right;font-weight:600' : ''}">${c}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('');
    return `<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;margin-bottom:6px;color:#0F2347">${esc(title)}</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;table-layout:auto"><thead><tr>${head}</tr></thead><tbody>${tbody}</tbody></table></div></div>`;
  };

  const inner = `
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #E65100;padding-bottom:10px;margin-bottom:12px">
      <div>
        <div style="font-size:17px;font-weight:800;color:#E65100">${esc(meta.businessName)}</div>
        <div style="font-size:10px;color:#4B5563;margin-top:4px">
          ${[meta.address, meta.phone ? `${isSw ? 'Simu' : 'Tel'}: ${esc(meta.phone)}` : ''].filter(Boolean).join(' · ')}
        </div>
        <div style="font-size:10px;color:#4B5563;margin-top:2px">
          ${meta.tinNumber ? `TIN: ${esc(meta.tinNumber)}` : ''}
          ${meta.vrnNumber ? ` · VRN: ${esc(meta.vrnNumber)}` : ''}
          ${meta.efdSerial ? ` · EFD: ${esc(meta.efdSerial)}` : ''}
        </div>
      </div>
      <div style="text-align:right;font-size:10px;color:#374151">
        <div style="font-weight:800;color:#0F2347;text-transform:uppercase">${isSw ? 'Ripoti ya TRA / EFD' : 'TRA / EFD Fiscal Report'}</div>
        <div style="margin-top:4px">${isSw ? 'Kipindi' : 'Period'}: ${esc(meta.periodFrom)} — ${esc(meta.periodTo)}</div>
        ${meta.taxOffice ? `<div>${isSw ? 'Ofisi ya kodi' : 'Tax office'}: ${esc(meta.taxOffice)}</div>` : ''}
      </div>
    </div>
    ${kpi}
    ${table(
      isSw ? 'Orodha ya risiti za kifaa cha kodi' : 'Fiscal receipt register',
      headers,
      rows,
      isSw ? 'Hakuna risiti katika kipindi hiki.' : 'No receipts in this period.',
    )}
    ${table(
      isSw ? 'Bidhaa kwa kila risiti' : 'Line items by receipt',
      isSw
        ? ['#', 'Risiti', 'Bidhaa', 'Qty', 'VAT', 'Jumla']
        : ['#', 'Receipt', 'Product', 'Qty', 'VAT', 'Total'],
      itemRows,
      isSw ? 'Hakuna mistari ya bidhaa.' : 'No line items recorded.',
    )}
    <div style="font-size:9px;color:#6B7280;margin-top:8px;border-top:1px solid #E5E7EB;padding-top:8px">
      ${isSw
        ? 'Ripoti ya usimamizi — si badala ya Z-Report rasmi kutoka TRA/EFD. Thibitisha kodi kwa ofisi yako ya kodi.'
        : 'Management report — not a substitute for the official EFD Z-Report. Confirm tax filings with TRA.'}
      · Net ${money(totalNet)} · VAT ${money(totalVat)} · Gross ${money(totalGross)}
    </div>
  `;

  return wrapReportPaper(inner, { landscape: true });
}

export function traReportMetaFromSettings(
  tax: TaxComplianceSettings,
  efd: EfdApiSettings,
  branding: { companyName?: string; address?: string; phone?: string; tinNumber?: string },
  extra: { ownerName?: string; branch?: string; periodFrom: string; periodTo: string },
): TraFiscalReportMeta {
  return {
    businessName: branding.companyName || tax.receiptBusinessName || 'Duka+',
    tinNumber: branding.tinNumber || tax.tinNumber,
    vrnNumber: efd.companyVrn || tax.vrnNumber,
    address: branding.address,
    phone: branding.phone,
    ownerName: extra.ownerName,
    branch: extra.branch,
    periodFrom: extra.periodFrom,
    periodTo: extra.periodTo,
    efdSerial: efd.companySerial || tax.traEfdSerial,
    taxOffice: efd.taxOffice,
  };
}
