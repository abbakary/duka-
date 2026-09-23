import QRCode from 'qrcode';
import type { SaleTransaction } from '@/types/v1';
import type {
  EfdApiSettings,
  TraCustomerIdType,
  TraReceipt,
  TraReceiptItem,
  TraReceiptStatus,
} from '@/types/traReceipt';
import type { TaxComplianceSettings } from '@/lib/taxComplianceSettings';
import {
  breakdownSaleAmounts,
  generateReceiptNumber,
  generateTraSignature,
} from '@/lib/taxComplianceSettings';
import { api } from '@/lib/api';
import { traCustomerIdTypeToCode } from '@/lib/traEfdConfigMap';

export interface TraReceiptBuildInput {
  sale: SaleTransaction;
  taxSettings: TaxComplianceSettings;
  efdSettings: EfdApiSettings;
  companyName: string;
  customerMobile?: string;
  customerIdType?: TraCustomerIdType;
  customerIdNumber?: string;
  branchId?: string;
}

export interface EfdApiSubmitResult {
  ok: boolean;
  receiptNumber?: string;
  verificationCode?: string;
  verificationLink?: string;
  zNumber?: string;
  vrn?: string;
  status?: TraReceiptStatus;
  rawResponse?: string;
  errorMessage?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function splitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    };
  }
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

function saleItemsToTraItems(sale: SaleTransaction, vatRate: number): TraReceiptItem[] {
  return sale.items.map(item => {
    const lineTotal = item.total ?? item.unitPrice * item.quantity;
    const vatAmount = Math.round(lineTotal * (vatRate / (1 + vatRate)));
    return {
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatAmount,
      total: lineTotal,
    };
  });
}

function buildVerificationLink(code: string, vrn: string): string {
  const q = encodeURIComponent(code);
  const v = encodeURIComponent(vrn.replace(/\s/g, ''));
  return `https://verify.tra.go.tz/?vrn=${v}&code=${q}`;
}

export async function generateTraVerificationQrDataUrl(link: string): Promise<string> {
  if (!link) return '';
  try {
    return await QRCode.toDataURL(link, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1E213D', light: '#FFFFFF' },
    });
  } catch {
    return '';
  }
}

function buildLocalTraResponse(
  receiptNumber: string,
  verificationCode: string,
  zNumber: string,
  vrn: string,
  demo: boolean,
): EfdApiSubmitResult {
  const verificationLink = buildVerificationLink(verificationCode, vrn);
  return {
    ok: true,
    receiptNumber,
    verificationCode,
    verificationLink,
    zNumber,
    vrn,
    status: demo ? 'demo' : 'success',
    rawResponse: JSON.stringify(
      {
        source: demo ? 'local_demo_efd' : 'local_tra_efd',
        receiptNumber,
        verificationCode,
        verificationLink,
        zNumber,
        vrn,
        message: demo
          ? 'Demo receipt — configure EFD API for live fiscal posting.'
          : 'Local TRA EFD receipt (API not enabled).',
      },
      null,
      2,
    ),
  };
}

export async function testEfdConnection(settings: EfdApiSettings): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!settings.clientId.trim()) {
    return { ok: false, message: 'Client ID is required.' };
  }
  if (!settings.hasClientSecret && !settings.clientSecret.trim()) {
    return { ok: false, message: 'Client secret is required for the first connection test.' };
  }
  if (!api.hasValidSession()) {
    return { ok: false, message: 'Sign in to test TRA connection securely on the server.' };
  }
  try {
    const result = await api.testTraEfdConnection();
    return { ok: result.ok, message: result.message };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Connection test failed',
    };
  }
}

export async function submitReceiptToEfdApi(
  settings: EfdApiSettings,
  sale: SaleTransaction,
  taxSettings: TaxComplianceSettings,
  meta: { companyName: string; customerMobile?: string; customerIdType?: TraCustomerIdType; customerIdNumber?: string },
): Promise<EfdApiSubmitResult> {
  if (!api.hasValidSession()) {
    return {
      ok: false,
      errorMessage: 'Sign in to issue fiscal receipts through the secure server proxy.',
      status: 'failed',
    };
  }

  const idTypeCode = traCustomerIdTypeToCode(meta.customerIdType);
  try {
    const response = await api.generateTraFiscalReceipt({
      sale: {
        id: sale.id,
        receipt_number: sale.receiptNumber,
        date: sale.date,
        customer_name: sale.customerName,
        subtotal: sale.subtotal,
        vat_amount: sale.vatAmount,
        total: sale.total,
        items: sale.items.map(i => ({
          product_id: i.productId,
          product_name: i.productName,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          total: i.total ?? i.unitPrice * i.quantity,
          discount_percent: i.discountPercent,
        })),
      },
      customer: {
        name: sale.customerName || 'Walk-in Customer',
        mobile: meta.customerMobile || '',
        id_type: idTypeCode,
        id_number: meta.customerIdNumber || '',
      },
      vat_rate: taxSettings.vatRate,
      branch_id: sale.branchId,
      payment_type: 'CASH',
    });

    const rawText = JSON.stringify(response, null, 2);
    if (!response.ok) {
      return {
        ok: false,
        errorMessage: String(response.error || 'TRA rejected receipt'),
        rawResponse: rawText,
        status: 'failed',
      };
    }

    const verificationCode = String(
      response.verification_code ?? response.verificationCode ?? '',
    );
    const verificationLink = String(
      response.verification_link ?? response.verify_link ?? response.verificationLink ?? '',
    );

    return {
      ok: true,
      receiptNumber: String(response.receipt_number ?? sale.receiptNumber),
      verificationCode,
      verificationLink,
      zNumber: String(response.z_number ?? settings.zNumber ?? settings.companySerial ?? ''),
      vrn: String(response.vrn ?? settings.companyVrn ?? taxSettings.vrnNumber),
      status: settings.demoMode ? 'demo' : 'success',
      rawResponse: rawText,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    if (settings.demoMode) {
      const receiptNumber = sale.receiptNumber || generateReceiptNumber(taxSettings);
      const zNumber =
        settings.zNumber || settings.companySerial || settings.deviceId || taxSettings.traEfdSerial || '—';
      const vrn = settings.companyVrn ?? taxSettings.vrnNumber;
      const demoCode =
        generateTraSignature(taxSettings, receiptNumber).split('-').pop()?.slice(0, 12) ||
        `DEMO${Date.now().toString(36).toUpperCase().slice(-8)}`;
      const fallback = buildLocalTraResponse(receiptNumber, demoCode, zNumber, vrn, true);
      fallback.rawResponse = JSON.stringify(
        { source: 'demo_fallback', message: 'Server TRA unavailable — local demo receipt.', originalError: errorMessage },
        null,
        2,
      );
      return fallback;
    }
    return {
      ok: false,
      errorMessage,
      status: 'failed',
      rawResponse: JSON.stringify({ error: errorMessage }, null, 2),
    };
  }
}

export async function issueTraReceipt(input: TraReceiptBuildInput): Promise<TraReceipt> {
  const { sale, taxSettings, efdSettings, companyName } = input;
  const { date, time } = splitDateTime(sale.date);
  const vrn = taxSettings.vrnNumber || '';
  const zNumber =
    efdSettings.zNumber || efdSettings.companySerial || efdSettings.deviceId || taxSettings.traEfdSerial || '—';
  const receiptNumber = sale.receiptNumber || generateReceiptNumber(taxSettings);
  const items = saleItemsToTraItems(sale, taxSettings.vatRate);

  let apiResult: EfdApiSubmitResult;

  if (taxSettings.mode === 'tra_efd' && efdSettings.enabled && efdSettings.clientId.trim()) {
    apiResult = await submitReceiptToEfdApi(efdSettings, sale, taxSettings, {
      companyName,
      customerMobile: input.customerMobile,
      customerIdType: input.customerIdType,
      customerIdNumber: input.customerIdNumber,
    });
    if (!apiResult.ok) {
      if (efdSettings.demoMode) {
        const originalError = apiResult.errorMessage || apiResult.rawResponse || 'TRA API error';
        const demoCode =
          generateTraSignature(taxSettings, receiptNumber).split('-').pop()?.slice(0, 12) ||
          `DEMO${Date.now().toString(36).toUpperCase().slice(-8)}`;
        apiResult = buildLocalTraResponse(receiptNumber, demoCode, zNumber, vrn, true);
        apiResult.rawResponse = JSON.stringify(
          {
            source: 'demo_fallback',
            message: 'Live TRA unavailable — showing demo fiscal receipt.',
            originalError,
          },
          null,
          2,
        );
      } else {
        const verificationCode =
          generateTraSignature(taxSettings, receiptNumber).slice(-12) ||
          `ERR-${Date.now().toString(36).toUpperCase()}`;
        return buildTraReceiptRecord({
          sale,
          companyName,
          receiptNumber,
          verificationCode,
          date,
          time,
          zNumber,
          vrn,
          verificationLink: '',
          items,
          status: 'failed',
          isDemo: false,
          apiResponse: apiResult.rawResponse || apiResult.errorMessage,
          customerMobile: input.customerMobile,
          customerIdType: input.customerIdType,
          customerIdNumber: input.customerIdNumber,
          branchId: input.branchId,
        });
      }
    }
  } else if (taxSettings.mode === 'tra_efd') {
    const verificationCode =
      generateTraSignature(taxSettings, receiptNumber).split('-').pop()?.slice(0, 12) ||
      `TRA${Date.now().toString(36).toUpperCase().slice(-8)}`;
    apiResult = buildLocalTraResponse(
      receiptNumber,
      verificationCode,
      zNumber,
      vrn,
      !efdSettings.enabled || efdSettings.demoMode,
    );
  } else {
    return buildTraReceiptRecord({
      sale,
      companyName,
      receiptNumber,
      verificationCode: '—',
      date,
      time,
      zNumber: '—',
      vrn: '—',
      verificationLink: '',
      items,
      status: 'pending',
      isDemo: true,
      apiResponse: 'Manual mode — TRA receipt not issued.',
      customerMobile: input.customerMobile,
      customerIdType: input.customerIdType ?? 'None',
      customerIdNumber: input.customerIdNumber,
      branchId: input.branchId,
    });
  }

  const verificationCode = apiResult.verificationCode || '';
  const verificationLink =
    apiResult.verificationLink || (verificationCode ? buildVerificationLink(verificationCode, apiResult.vrn || vrn) : '');

  return buildTraReceiptRecord({
    sale,
    companyName,
    receiptNumber: apiResult.receiptNumber || receiptNumber,
    verificationCode,
    date,
    time,
    zNumber: apiResult.zNumber || zNumber,
    vrn: apiResult.vrn || vrn,
    verificationLink,
    items,
    status: apiResult.status || (efdSettings.demoMode ? 'demo' : 'success'),
    isDemo: efdSettings.demoMode || apiResult.status === 'demo',
    apiResponse: apiResult.rawResponse,
    customerMobile: input.customerMobile,
    customerIdType: input.customerIdType,
    customerIdNumber: input.customerIdNumber,
    branchId: input.branchId,
  });
}

async function buildTraReceiptRecord(opts: {
  sale: SaleTransaction;
  companyName: string;
  receiptNumber: string;
  verificationCode: string;
  date: string;
  time: string;
  zNumber: string;
  vrn: string;
  verificationLink: string;
  items: TraReceiptItem[];
  status: TraReceiptStatus;
  isDemo: boolean;
  apiResponse?: string;
  customerMobile?: string;
  customerIdType?: TraCustomerIdType;
  customerIdNumber?: string;
  branchId?: string;
}): Promise<TraReceipt> {
  const qr = opts.verificationLink
    ? await generateTraVerificationQrDataUrl(opts.verificationLink)
    : '';

  const { gross: totalIncl, vat: totalVat, netBeforeVat: totalExcl } = breakdownSaleAmounts({
    subtotal: opts.sale.subtotal,
    vatAmount: opts.sale.vatAmount,
    total: opts.sale.total,
  });
  return {
    id: `tra-${opts.sale.id}-${Date.now()}`,
    receiptNumber: opts.receiptNumber,
    verificationCode: opts.verificationCode,
    receiptDate: opts.date,
    receiptTime: opts.time,
    zNumber: opts.zNumber,
    vrn: opts.vrn,
    verificationLink: opts.verificationLink,
    verificationQrDataUrl: qr || undefined,
    source: 'pos_order',
    companyName: opts.companyName,
    invoiceReference: opts.sale.receiptNumber,
    invoiceDate: opts.date,
    saleId: opts.sale.id,
    posOrderId: opts.sale.id,
    customerName: opts.sale.customerName || 'Walk-in Customer',
    customerIdType: opts.customerIdType ?? 'None',
    customerIdNumber: opts.customerIdNumber ?? '',
    customerMobile: opts.customerMobile ?? '',
    totalExclTax: totalExcl,
    totalVat,
    totalInclTax: totalIncl,
    status: opts.status,
    isDemo: opts.isDemo,
    items: opts.items,
    apiResponse: opts.apiResponse,
    branchId: opts.branchId,
    createdAt: new Date().toISOString(),
  };
}

export const TRA_CUSTOMER_ID_TYPES: TraCustomerIdType[] = [
  'TIN',
  'NIDA',
  'Passport',
  'Driving License',
  'None',
];
