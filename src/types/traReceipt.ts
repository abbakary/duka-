export type TraCustomerIdType = 'TIN' | 'NIDA' | 'Passport' | 'Driving License' | 'None';

export type TraReceiptStatus = 'success' | 'failed' | 'pending' | 'demo';

export type TraReceiptSource = 'pos_order' | 'invoice' | 'manual';

export interface TraReceiptItem {
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatAmount: number;
  total: number;
}

export interface TraReceipt {
  id: string;
  receiptNumber: string;
  verificationCode: string;
  receiptDate: string;
  receiptTime: string;
  zNumber: string;
  vrn: string;
  verificationLink: string;
  verificationQrDataUrl?: string;
  source: TraReceiptSource;
  companyName: string;
  invoiceReference: string;
  invoiceDate: string;
  saleId?: string;
  posOrderId?: string;
  customerName: string;
  customerIdType: TraCustomerIdType;
  customerIdNumber: string;
  customerMobile: string;
  totalExclTax: number;
  totalVat: number;
  totalInclTax: number;
  status: TraReceiptStatus;
  isDemo: boolean;
  items: TraReceiptItem[];
  apiResponse?: string;
  branchId?: string;
  createdAt: string;
}

export type TraEfdConnectionStatus = 'not_tested' | 'connected' | 'failed';

export type TraEfdCustomerIdTypeCode = '1' | '2' | '3' | '4' | '5' | '6';

export interface EfdApiSettings {
  /** When true, receipts post through the server TRA proxy (recommended). */
  enabled: boolean;
  apiBaseUrl: string;
  clientId: string;
  /** Only used while saving; cleared after sync when secret is stored server-side. */
  clientSecret: string;
  hasClientSecret?: boolean;
  companyCity: string;
  companyMobile: string;
  defaultCustomerIdType: TraEfdCustomerIdTypeCode;
  demoMode: boolean;
  connectionStatus?: TraEfdConnectionStatus;
  companyVrn?: string;
  companyTin?: string;
  companySerial?: string;
  companyVin?: string;
  taxOffice?: string;
  tokenUserName?: string;
  tokenEmail?: string;
  lastConnection?: string;
  lastTestAt?: string;
  lastTestOk?: boolean;
  lastTestMessage?: string;
  /** Legacy local-only fields (migrated away from browser TRA calls). */
  apiKey?: string;
  apiSecret?: string;
  deviceId?: string;
  zNumber?: string;
}

export const DEFAULT_EFD_API_BASE =
  'https://webshop.co.tz/api/public/index.php/api/v1';

export const DEFAULT_EFD_API_SETTINGS: EfdApiSettings = {
  enabled: false,
  apiBaseUrl: DEFAULT_EFD_API_BASE,
  clientId: '',
  clientSecret: '',
  companyCity: '',
  companyMobile: '',
  defaultCustomerIdType: '6',
  demoMode: false,
  connectionStatus: 'not_tested',
};
