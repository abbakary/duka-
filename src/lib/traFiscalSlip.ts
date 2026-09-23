import traLogoAsset from '@/assets/tralogo.png';
import type { TraReceipt } from '@/types/traReceipt';
import type { TaxComplianceSettings } from '@/lib/taxComplianceSettings';
import { formatTSh } from '@/utils/translations';
import { formatTzMobilePhone } from '@/lib/formatTzPhone';
import { printHtmlPage } from '@/lib/documentRenderer';

export function traLogoUrl(): string {
  const path = typeof traLogoAsset === 'string' ? traLogoAsset : String(traLogoAsset);
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path;
}

export interface TraFiscalSlipMeta {
  mobile?: string;
  taxOffice?: string;
  serialNumber?: string;
  datetimeIso?: string;
}

function dash(): string {
  return '--------------------------------';
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Thermal-style TRA legal receipt HTML matching EFD slip layout. */
export function buildTraFiscalSlipHtml(
  receipt: TraReceipt,
  tax: TaxComplianceSettings,
  meta: TraFiscalSlipMeta = {},
): string {
  const logo = traLogoUrl();
  const business = receipt.companyName || tax.receiptBusinessName || 'Business';
  const businessMobile = formatTzMobilePhone(meta.mobile);
  const customerMobile = formatTzMobilePhone(receipt.customerMobile);
  const tin = tax.tinNumber || '—';
  const vrn = receipt.vrn || tax.vrnNumber || '—';
  const serial = meta.serialNumber || tax.traEfdSerial || '—';
  const taxOffice = meta.taxOffice || '—';
  const customerTin =
    receipt.customerIdType === 'TIN' && receipt.customerIdNumber
      ? receipt.customerIdNumber
      : 'NIL';
  const datetime =
    meta.datetimeIso ||
    `${receipt.receiptDate}T${receipt.receiptTime}`;
  const hasQr = Boolean(receipt.verificationQrDataUrl);
  const hasCode = Boolean(receipt.verificationCode && receipt.verificationCode !== '—' && receipt.verificationCode !== 'PENDING!');
  const failed = receipt.status === 'failed' && !receipt.isDemo;
  const totalExcl =
    receipt.totalExclTax > 0 && receipt.totalInclTax > receipt.totalExclTax
      ? receipt.totalExclTax
      : Math.max(0, receipt.totalInclTax - receipt.totalVat);
  const totalIncl = receipt.totalInclTax || totalExcl + receipt.totalVat;

  const itemRows = receipt.items
    .map(
      i => `
      <tr>
        <td style="text-align:left;padding:2px 0;word-break:break-word">${esc(i.productName)}</td>
        <td style="text-align:center;padding:2px 2px;white-space:nowrap">${i.quantity}</td>
        <td style="text-align:right;padding:2px 0;white-space:nowrap">${esc(formatTSh(i.total))}</td>
      </tr>`,
    )
    .join('');

  return `
<div class="tra-slip" style="width:280px;max-width:100%;margin:0 auto;font-family:ui-monospace,Consolas,'Courier New',monospace;font-size:11px;line-height:1.35;color:#111;background:#fff">
  <div style="text-align:center;font-weight:700;letter-spacing:0.02em">*** START OF LEGAL RECEIPT ***</div>
  <div style="text-align:center;margin:4px 0">${dash()}</div>

  <div style="text-align:center;margin:8px 0">
    <img src="${esc(logo)}" alt="TRA" style="width:72px;height:auto;object-fit:contain" />
  </div>

  <div style="text-align:center;font-weight:800;font-size:13px;margin-bottom:4px">${esc(business)}</div>
  <div style="text-align:left">
    <div>MOBILE: ${esc(businessMobile)}</div>
    <div>TIN: ${esc(tin)}</div>
    <div>VRN: ${esc(vrn)}</div>
    <div>SERIAL NUMBER: ${esc(serial)}</div>
    <div>TAX OFFICE: ${esc(taxOffice)}</div>
  </div>

  <div style="text-align:center;margin:6px 0">${dash()}</div>

  <div style="text-align:left">
    <div>CUSTOMER NAME: ${esc(receipt.customerName || 'Walk-in')}</div>
    <div>CUSTOMER TIN / ID: ${esc(customerTin)}</div>
    <div>MOBILE: ${esc(customerMobile)}</div>
  </div>

  <div style="text-align:center;margin:6px 0">${dash()}</div>

  <div style="text-align:left">
    <div>RECEIPT NO: ${esc(receipt.receiptNumber)}</div>
    <div>Z NUMBER: ${esc(receipt.zNumber || 'PENDING')}</div>
    <div>DATETIME: ${esc(datetime)}</div>
  </div>

  <div style="text-align:center;margin:6px 0">${dash()}</div>

  <div style="text-align:center;font-weight:800;margin-bottom:4px">PURCHASED ITEMS</div>
  <table style="width:100%;border-collapse:collapse;font-size:10px">
    <thead>
      <tr>
        <th style="text-align:left;border-bottom:1px dashed #999;padding:2px 0">Item</th>
        <th style="text-align:center;border-bottom:1px dashed #999;padding:2px">Qty</th>
        <th style="text-align:right;border-bottom:1px dashed #999;padding:2px 0">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div style="text-align:center;margin:6px 0">${dash()}</div>

  <div style="text-align:left">
    <div style="display:flex;justify-content:space-between"><span>Total Excl. TAX:</span><span>${esc(formatTSh(totalExcl))}</span></div>
    <div style="display:flex;justify-content:space-between"><span>TAX (18%):</span><span>${esc(formatTSh(receipt.totalVat))}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:800"><span>TOTAL INCL. TAX:</span><span>${esc(formatTSh(totalIncl))}</span></div>
  </div>

  <div style="text-align:center;margin:6px 0">${dash()}</div>

  <div style="text-align:center;font-weight:800;margin-bottom:4px">RECEIPT VERIFICATION CODE</div>
  <div style="text-align:center;font-weight:900;font-size:14px;letter-spacing:0.04em;margin-bottom:8px">
    ${esc(hasCode ? receipt.verificationCode : 'PENDING!')}
  </div>

  ${
    hasQr
      ? `<div style="text-align:center;margin:8px 0">
           <img src="${esc(receipt.verificationQrDataUrl!)}" alt="TRA QR" style="width:132px;height:132px;object-fit:contain" />
           <div style="font-size:9px;color:#444;margin-top:4px">Scan to verify on TRA</div>
         </div>`
      : failed
        ? `<div style="border:1px solid #c00;color:#a00;padding:6px;font-size:9px;text-align:left;margin:6px 0;word-break:break-word">
             <strong>TRA ERROR</strong><br/>${esc(receipt.apiResponse || 'Verification unavailable')}
           </div>`
        : receipt.isDemo || receipt.status === 'demo'
          ? `<div style="text-align:center;font-size:9px;color:#555;margin:6px 0;border:1px dashed #999;padding:4px">
               Demo fiscal receipt — configure live TRA EFD for production verification.
             </div>`
          : `<div style="text-align:center;font-size:9px;color:#666;margin:6px 0">
               QR appears when TRA EFD returns a verification link.
             </div>`
  }

  ${
    receipt.verificationLink
      ? `<div style="text-align:center;font-size:8px;word-break:break-all;color:#333;margin-top:4px">${esc(receipt.verificationLink)}</div>`
      : ''
  }

  <div style="text-align:center;margin:8px 0">${dash()}</div>
  <div style="text-align:center;font-weight:700">*** END OF LEGAL RECEIPT ***</div>
  ${tax.receiptFooterNote ? `<div style="text-align:center;font-size:9px;margin-top:6px;color:#444">${esc(tax.receiptFooterNote)}</div>` : ''}
</div>`;
}

export function printTraFiscalSlip(
  receipt: TraReceipt,
  tax: TaxComplianceSettings,
  meta: TraFiscalSlipMeta = {},
  isSw = false,
): boolean {
  const body = `
<div style="background:#fff;padding:8px">
  ${buildTraFiscalSlipHtml(receipt, tax, meta)}
</div>`;
  return printHtmlPage(receipt.receiptNumber || 'TRA-Receipt', body, isSw);
}
