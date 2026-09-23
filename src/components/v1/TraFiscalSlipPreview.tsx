import React from 'react';
import type { TraReceipt } from '@/types/traReceipt';
import type { TaxComplianceSettings } from '@/lib/taxComplianceSettings';
import { formatTSh } from '@/utils/translations';
import { traLogoUrl, type TraFiscalSlipMeta } from '@/lib/traFiscalSlip';
import { formatTzMobilePhone } from '@/lib/formatTzPhone';

interface Props {
  receipt: TraReceipt;
  tax: TaxComplianceSettings;
  meta?: TraFiscalSlipMeta;
  className?: string;
}

/** On-screen TRA legal receipt preview (logo + items + verification / QR). */
export const TraFiscalSlipPreview: React.FC<Props> = ({
  receipt,
  tax,
  meta = {},
  className = '',
}) => {
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
  const datetime = meta.datetimeIso || `${receipt.receiptDate}T${receipt.receiptTime}`;
  const hasQr = Boolean(receipt.verificationQrDataUrl);
  const hasCode = Boolean(
    receipt.verificationCode &&
      receipt.verificationCode !== '—' &&
      receipt.verificationCode !== 'PENDING!',
  );
  const failed = receipt.status === 'failed' && !receipt.isDemo;
  const totalExcl =
    receipt.totalExclTax > 0 && receipt.totalInclTax > receipt.totalExclTax
      ? receipt.totalExclTax
      : Math.max(0, receipt.totalInclTax - receipt.totalVat);
  const totalIncl = receipt.totalInclTax || totalExcl + receipt.totalVat;

  return (
    <div
      className={`mx-auto w-full max-w-[300px] bg-white text-[11px] leading-snug font-mono text-[#111] ${className}`}
    >
      <div className="text-center font-bold tracking-wide">*** START OF LEGAL RECEIPT ***</div>
      <div className="text-center my-1">--------------------------------</div>

      <div className="flex justify-center my-2">
        <img src={traLogoUrl()} alt="TRA" className="w-[72px] h-auto object-contain" />
      </div>

      <div className="text-center font-extrabold text-[13px] mb-1">{business}</div>
      <div>
        <div>MOBILE: {businessMobile}</div>
        <div>TIN: {tin}</div>
        <div>VRN: {vrn}</div>
        <div>SERIAL NUMBER: {serial}</div>
        <div>TAX OFFICE: {taxOffice}</div>
      </div>

      <div className="text-center my-1.5">--------------------------------</div>

      <div>
        <div>CUSTOMER NAME: {receipt.customerName || 'Walk-in'}</div>
        <div>CUSTOMER TIN / ID: {customerTin}</div>
        <div>MOBILE: {customerMobile}</div>
      </div>

      <div className="text-center my-1.5">--------------------------------</div>

      <div>
        <div>RECEIPT NO: {receipt.receiptNumber}</div>
        <div>Z NUMBER: {receipt.zNumber || 'PENDING'}</div>
        <div>DATETIME: {datetime}</div>
      </div>

      <div className="text-center my-1.5">--------------------------------</div>

      <div className="text-center font-extrabold mb-1">PURCHASED ITEMS</div>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-dashed border-[#999]">
            <th className="text-left py-0.5 font-bold">Item</th>
            <th className="text-center py-0.5 font-bold">Qty</th>
            <th className="text-right py-0.5 font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((i, idx) => (
            <tr key={`${i.productName}-${idx}`}>
              <td className="text-left py-0.5 pr-1 break-words">{i.productName}</td>
              <td className="text-center py-0.5 whitespace-nowrap">{i.quantity}</td>
              <td className="text-right py-0.5 whitespace-nowrap">{formatTSh(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center my-1.5">--------------------------------</div>

      <div className="space-y-0.5">
        <div className="flex justify-between gap-2">
          <span>Total Excl. TAX:</span>
          <span>{formatTSh(totalExcl)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>TAX (18%):</span>
          <span>{formatTSh(receipt.totalVat)}</span>
        </div>
        <div className="flex justify-between gap-2 font-extrabold">
          <span>TOTAL INCL. TAX:</span>
          <span>{formatTSh(totalIncl)}</span>
        </div>
      </div>

      <div className="text-center my-1.5">--------------------------------</div>

      <div className="text-center font-extrabold mb-1">RECEIPT VERIFICATION CODE</div>
      <div className="text-center font-black text-sm tracking-wide mb-2">
        {hasCode ? receipt.verificationCode : 'PENDING!'}
      </div>

      {hasQr ? (
        <div className="text-center my-2">
          <img
            src={receipt.verificationQrDataUrl}
            alt="TRA verification QR"
            className="mx-auto w-[132px] h-[132px] object-contain"
          />
          <div className="text-[9px] text-[#444] mt-1">Scan to verify on TRA</div>
        </div>
      ) : failed ? (
        <div className="border border-red-600 text-red-700 p-1.5 text-[9px] text-left my-1.5 break-words">
          <strong>TRA ERROR</strong>
          <br />
          {receipt.apiResponse || 'Verification unavailable'}
        </div>
      ) : receipt.isDemo || receipt.status === 'demo' ? (
        <div className="text-center text-[9px] text-[#555] my-1.5 border border-dashed border-[#999] p-1">
          Demo fiscal receipt — configure live TRA EFD for production verification.
        </div>
      ) : (
        <div className="text-center text-[9px] text-[#666] my-1.5">
          QR appears when TRA EFD returns a verification link.
        </div>
      )}

      {receipt.verificationLink ? (
        <div className="text-center text-[8px] break-all text-[#333] mt-1">{receipt.verificationLink}</div>
      ) : null}

      <div className="text-center my-2">--------------------------------</div>
      <div className="text-center font-bold">*** END OF LEGAL RECEIPT ***</div>
      {tax.receiptFooterNote ? (
        <div className="text-center text-[9px] mt-1.5 text-[#444]">{tax.receiptFooterNote}</div>
      ) : null}
    </div>
  );
};
