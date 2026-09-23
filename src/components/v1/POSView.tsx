import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  CheckCircle2, 
  Receipt, 
  ShieldCheck, 
  Sparkles, 
  Printer, 
  X,
  QrCode,
  DollarSign,
  User,
  UserPlus,
  AlertTriangle,
  Camera,
  AlertCircle,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Send,
  Info,
  Lock,
  Unlock,
  ChevronUp,
  Home,
  LayoutGrid,
} from 'lucide-react';
import { CartItem, Customer, Language, PaymentMethod, Product, SaleTransaction, BusinessType, AuthUser } from '@/types/v1';
import { formatTSh, getTranslation } from '@/utils/translations';
import { getWorkplace } from '@/lib/businessProfiles';
import { productMatchesSearch } from '@/lib/productMetaDisplay';
import { ProductMetaBadges } from '@/components/v1/ProductMetaBadges';
import { ProductImageThumb } from '@/components/v1/ProductImage';
import { POSQRScannerModal } from '@/components/v1/POSQRScannerModal';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { useEffectiveTaxCompliance } from '@/context/TaxComplianceContext';
import { useTraReceipts } from '@/context/TraReceiptContext';
import type { TraReceipt } from '@/types/traReceipt';
import { useDocumentTemplates } from '@/context/DocumentTemplateContext';
import { printDocument } from '@/lib/documentRenderer';
import { saleReceiptRenderData } from '@/lib/documentDataMappers';
import {
  calculateSaleTotals,
  formatVatLabel,
  generateReceiptNumber,
  generateTraSignature,
  computeDiscountedSubtotal,
  capDiscountPercent,
  effectiveUnitPrice,
  isVatActive,
  getComplianceStatusLabel,
} from '@/lib/taxComplianceSettings';
import { computeSaleDiscountAmount, saleGrossSubtotal } from '@/lib/saleDiscountUtils';
import { resolvePosPricingAccess, getDashboardPersona } from '@/lib/rbac';
import { api } from '@/lib/api';
import { mapCustomer, customerToApiPayload, filterByActiveBranch } from '@/lib/apiSync';
import type { StoreBranch } from '@/types/v1';
import {
  buildSaleFromCart,
  draftFromPosState,
  upsertOpenTransaction,
  removeOpenTransaction,
  generateClientTransactionId,
} from '@/lib/transactionEngine';
import confetti from 'canvas-confetti';
import {
  todayIsoDate,
  defaultCreditDueDate,
  validatePaymentDueDate,
  formatDueDateDisplay,
} from '@/lib/dueDate';
import { TraFiscalSlipPreview } from '@/components/v1/TraFiscalSlipPreview';
import { printTraFiscalSlip } from '@/lib/traFiscalSlip';
import { buildTraSlipMeta } from '@/lib/traFiscalSlipMeta';
import {
  closeCashierShift,
  getOpenCashierShift,
  openCashierShift,
  type CashierShiftSession,
} from '@/lib/cashierShiftStore';

type PosReceiptType = 'tra_fiscal' | 'standard';

interface POSViewProps {
  language: Language;
  products: Product[];
  customers: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  onCompleteSale: (sale: SaleTransaction) => void;
  onSavePending?: (sale: SaleTransaction) => void | Promise<void>;
  onFinalizeResume?: (saleId: string, sale: SaleTransaction) => Promise<void>;
  onOpenPending?: () => void;
  tenantId?: string;
  pendingCount?: number;
  cashierName?: string;
  onCustomersChanged?: () => void | Promise<void>;
  onOpenAIChatWithPrompt?: (prompt: string) => void;
  onNavigateToReceivables?: () => void;
  businessType?: BusinessType;
  initialCart?: CartItem[];
  initialCustomerId?: string;
  initialCustomerName?: string;
  initialDraftId?: string;
  resumeSaleId?: string;
  onResumeConsumed?: () => void;
  tableContextLabel?: string;
  currentUser?: AuthUser | null;
  activeBranchId?: string | null;
  branches?: StoreBranch[];
  branchVatRegistered?: boolean | null;
  /** Leave full-screen POS back to main dashboard / menu */
  onExitPOS?: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  language,
  products,
  customers,
  setCustomers,
  onCompleteSale,
  onSavePending,
  onFinalizeResume,
  onOpenPending,
  tenantId,
  pendingCount = 0,
  cashierName = 'Cashier',
  onCustomersChanged,
  onOpenAIChatWithPrompt,
  onNavigateToReceivables,
  businessType = 'retail',
  initialCart,
  initialCustomerId,
  initialCustomerName,
  initialDraftId,
  resumeSaleId,
  onResumeConsumed,
  tableContextLabel,
  currentUser,
  activeBranchId,
  branches = [],
  branchVatRegistered,
  onExitPOS,
}) => {
  const isSw = language === 'sw';
  const t = (key: any) => getTranslation(language, key);
  const workplace = getWorkplace(businessType, isSw ? 'sw' : 'en');
  const taxSettings = useEffectiveTaxCompliance(activeBranchId, branchVatRegistered);
  const vatActive = isVatActive(taxSettings);
  const { issueFromSale, efdSettings } = useTraReceipts();
  const { config, getActive } = useDocumentTemplates();
  const pricing = useMemo(
    () => resolvePosPricingAccess(currentUser, taxSettings),
    [currentUser, taxSettings],
  );

  const tenantKey = tenantId || currentUser?.businessId || currentUser?.id || 'local';
  const staffKey = currentUser?.staffId || currentUser?.id || currentUser?.email || 'anon';
  const requiresOpenShift = getDashboardPersona(currentUser ?? null) === 'cashier';
  const [openShift, setOpenShift] = useState<CashierShiftSession | null>(() =>
    typeof window !== 'undefined' ? getOpenCashierShift(tenantKey, staffKey) : null,
  );
  const [openingFloat, setOpeningFloat] = useState('0');

  useEffect(() => {
    setOpenShift(getOpenCashierShift(tenantKey, staffKey));
  }, [tenantKey, staffKey]);

  const branchCustomers = useMemo(
    () => filterByActiveBranch(customers, activeBranchId, branches),
    [customers, activeBranchId, branches],
  );
  const branchProducts = useMemo(
    () => filterByActiveBranch(products, activeBranchId, branches),
    [products, activeBranchId, branches],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>(initialCart ?? []);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId ?? '');
  const openDraftIdRef = React.useRef<string | null>(initialDraftId ?? null);
  const savingPendingRef = React.useRef(false);
  const resumeSaleIdRef = React.useRef<string | null>(resumeSaleId ?? null);
  const resumeCustomerPinRef = useRef<{ id?: string; name?: string } | null>(
    initialCustomerId || initialCustomerName
      ? { id: initialCustomerId, name: initialCustomerName }
      : null,
  );

  React.useEffect(() => {
    if (initialCart?.length) {
      setCart(initialCart);
    }
  }, [initialCart]);

  React.useEffect(() => {
    if (!initialCustomerId && !initialCustomerName) return;
    resumeCustomerPinRef.current = {
      id: initialCustomerId,
      name: initialCustomerName,
    };
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      return;
    }
    if (!initialCustomerName) return;

    const resumeId = `resume-${initialCustomerName.toLowerCase().replace(/\s+/g, '-')}`;
    if (!customers.length) {
      setSelectedCustomerId(resumeId);
      return;
    }

    const match = branchCustomers.find(
      c => c.name.toLowerCase() === initialCustomerName.toLowerCase(),
    );
    setSelectedCustomerId(match?.id ?? initialCustomerId ?? resumeId);
  }, [initialCustomerId, initialCustomerName, customers, branchCustomers]);

  React.useEffect(() => {
    if (!activeBranchId || !selectedCustomerId) return;
    if (selectedCustomerId.startsWith('resume-')) return;
    if (!branchCustomers.some(c => c.id === selectedCustomerId)) {
      setSelectedCustomerId('');
    }
  }, [activeBranchId, branchCustomers, selectedCustomerId]);

  React.useEffect(() => {
    if (initialDraftId) openDraftIdRef.current = initialDraftId;
  }, [initialDraftId]);

  React.useEffect(() => {
    resumeSaleIdRef.current = resumeSaleId ?? null;
  }, [resumeSaleId]);

  // Payment Options — must be declared before effects that reference paymentMode
  const [paymentMode, setPaymentMode] = useState<'full' | 'partial' | 'credit'>('full');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [cartDiscountPercent, setCartDiscountPercent] = useState<number>(0);
  const [paymentDueDate, setPaymentDueDate] = useState<string>('');
  /** Cart list vs payment step — keeps selected items visible (no crowded payment pad). */
  const [posStep, setPosStep] = useState<'cart' | 'pay'>('cart');
  /** Mobile bottom sheet for cart / checkout */
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const partialAmountRef = useRef<HTMLInputElement>(null);
  /** Per-sale VAT: default follows shop settings; cashier can flip for this cart. */
  const [applyVatThisSale, setApplyVatThisSale] = useState<boolean>(vatActive);
  /** TRA fiscal (send to EFD + legal slip) vs standard shop receipt (no TRA). */
  const [receiptType, setReceiptType] = useState<PosReceiptType>(
    taxSettings.mode === 'tra_efd' ? 'tra_fiscal' : 'standard',
  );

  useEffect(() => {
    setApplyVatThisSale(vatActive);
  }, [vatActive, activeBranchId]);

  useEffect(() => {
    setReceiptType(taxSettings.mode === 'tra_efd' ? 'tra_fiscal' : 'standard');
  }, [taxSettings.mode, activeBranchId]);

  const canIssueTraFiscal = taxSettings.mode === 'tra_efd';
  const wantTraFiscal = canIssueTraFiscal && receiptType === 'tra_fiscal';

  const saleTaxSettings = useMemo(() => {
    if (!taxSettings.vatRegistered || taxSettings.mode === 'non_vat') {
      return taxSettings;
    }
    if (applyVatThisSale) {
      return { ...taxSettings, vatEnabled: true };
    }
    return {
      ...taxSettings,
      mode: 'manual' as const,
      vatEnabled: false,
      showVatOnReceipt: false,
    };
  }, [taxSettings, applyVatThisSale]);

  const canToggleSaleVat =
    taxSettings.vatRegistered && taxSettings.mode !== 'non_vat';

  React.useEffect(() => {
    if (!pricing.canUsePartialPayment && paymentMode !== 'full') {
      setPaymentMode('full');
    }
  }, [pricing.canUsePartialPayment, paymentMode]);
  
  const [lastCompletedSale, setLastCompletedSale] = useState<SaleTransaction | null>(null);
  const [lastTraReceipt, setLastTraReceipt] = useState<TraReceipt | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // New Customer On-The-Fly Modal State
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '+255 ',
    email: '',
    address: 'Kariakoo, Dar es Salaam',
    creditLimit: '300000',
    notes: 'Registered at POS Register',
  });

  // Stock Warning & Validation Banner State
  const [stockWarningMessage, setStockWarningMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const categories = ['all', ...Array.from(new Set(branchProducts.map(p => p.category)))];

  const filteredProducts = branchProducts.filter(p => {
    const matchesSearch = productMatchesSearch(p, businessType, searchQuery)
      || p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      || (p.batchNumber && p.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const selectedCustomer = useMemo(() => {
    const found = branchCustomers.find(c => c.id === selectedCustomerId);
    if (found) return found;

    const pin = resumeCustomerPinRef.current;
    if (!pin?.name) return undefined;

    const byName = branchCustomers.find(
      c => c.name.toLowerCase() === pin.name!.toLowerCase(),
    );
    if (byName) return byName;

    if (pin.id === selectedCustomerId || pin.name) {
      return {
        id: pin.id ?? selectedCustomerId,
        name: pin.name,
        phone: '',
        email: '',
        address: '',
        creditLimit: 300_000,
        balance: 0,
        joinedDate: '',
        loyaltyTier: 'Bronze' as const,
        loyaltyPoints: 0,
        riskScore: 'Low' as const,
        dunningStage: 'cleared' as const,
        daysOverdue: 0,
        lastPurchaseDate: '',
        totalPurchases: 0,
        avatarColor: '#6264A7',
      } satisfies Customer;
    }
    return undefined;
  }, [branchCustomers, selectedCustomerId]);

  // Autosave open cart to local storage (recovery after crash/refresh)
  useEffect(() => {
    if (!tenantId || cart.length === 0) return;
    if (resumeSaleIdRef.current) return;
    if (savingPendingRef.current) return;
    if (!openDraftIdRef.current) {
      openDraftIdRef.current = generateClientTransactionId();
    }
    const draft = draftFromPosState(cart, {
      id: openDraftIdRef.current,
      customerId: selectedCustomer?.id || selectedCustomerId || undefined,
      customerName: selectedCustomer?.name || resumeCustomerPinRef.current?.name,
      paymentMode,
      selectedPaymentMethod,
      amountPaidInput,
      status: 'open',
    });
    draft.clientTransactionId = openDraftIdRef.current;
    upsertOpenTransaction(tenantId, draft);
  }, [tenantId, cart, selectedCustomer, selectedCustomerId, paymentMode, selectedPaymentMethod, amountPaidInput]);

  // Flash warning helper
  const triggerStockWarning = (msg: string) => {
    setStockWarningMessage(msg);
    setTimeout(() => {
      setStockWarningMessage(null);
    }, 4500);
  };

  // Cart operations with strict stock checking
  const handleAddToCart = (product: Product) => {
    // 1. Check if product is physically out of stock
    if (product.stock <= 0) {
      triggerStockWarning(
        isSw 
          ? `⚠️ HAKUNA STOO! Bidhaa "${product.name}" haina idadi iliyobaki stoo (0 ${product.unit}). Tafadhali agiza kutoka kwa msambazaji.`
          : `⚠️ OUT OF STOCK! "${product.name}" has 0 ${product.unit} available in inventory.`
      );
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Check if adding +1 exceeds available physical stock
        if (existing.quantity + 1 > product.stock) {
          triggerStockWarning(
            isSw
              ? `⚠️ HIFADHI HAITOSHI! Bidhaa "${product.name}" ina ${product.stock} ${product.unit} tu stoo. Hauwezi kuongeza zaidi ya kiasi kilichopo.`
              : `⚠️ INSUFFICIENT STOCK! "${product.name}" only has ${product.stock} ${product.unit} available. Cannot exceed physical stock.`
          );
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      // If brand new in cart, check stock >= 1
      return [...prev, { product, quantity: 1, discountPercent: 0 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return item; // Handled by delete or minimum 1

        if (nextQty > prod.stock) {
          triggerStockWarning(
            isSw
              ? `⚠️ HIFADHI HAITOSHI! Idadi uliyoomba (${nextQty} ${prod.unit}) inazidi kiasi kilichopo stoo (${prod.stock} ${prod.unit}) kwa "${prod.name}".`
              : `⚠️ INSUFFICIENT STOCK! Requested quantity (${nextQty}) exceeds available stock (${prod.stock}) for "${prod.name}".`
          );
          return { ...item, quantity: prod.stock };
        }

        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  const handleDirectQtyInput = (productId: string, val: string) => {
    const parsed = parseInt(val, 10);
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (isNaN(parsed) || parsed <= 0) {
      setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: 1 } : item));
      return;
    }

    if (parsed > prod.stock) {
      triggerStockWarning(
        isSw
          ? `⚠️ HIFADHI HAITOSHI! Idadi uliyoweka (${parsed}) inazidi stoo iliyopo (${prod.stock} ${prod.unit}) kwa "${prod.name}". Mfumo umeweka kiwango cha juu cha ${prod.stock}.`
          : `⚠️ INSUFFICIENT STOCK! Entered quantity (${parsed}) exceeds available stock (${prod.stock}). Capped at ${prod.stock}.`
      );
      setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: prod.stock } : item));
      return;
    }

    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: parsed } : item));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleUpdateDiscount = (productId: string, raw: string) => {
    const parsed = parseFloat(raw);
    let pct = isNaN(parsed) ? 0 : parsed;
    if (!pricing.canApplyDiscount) {
      pct = 0;
    } else if (pct > taxSettings.maxDiscountPercent && !pricing.canApproveHighDiscount) {
      pct = taxSettings.maxDiscountPercent;
    } else {
      pct = Math.min(Math.max(pct, 0), 100);
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, discountPercent: pct } : item,
      ),
    );
  };

  const handleUpdateUnitPrice = (productId: string, raw: string) => {
    if (!pricing.canOverridePrice) return;
    const parsed = parseFloat(raw.replace(/,/g, ''));
    setCart(prev =>
      prev.map(item => {
        if (item.product.id !== productId) return item;
        if (!raw.trim() || isNaN(parsed) || parsed <= 0) {
          return { ...item, unitPriceOverride: undefined };
        }
        return { ...item, unitPriceOverride: parsed };
      }),
    );
  };

  // Financial Calculations (per-line discounts when enabled)
  const { subtotal, discountAmount, grossSubtotal } = computeDiscountedSubtotal(
    cart.map(item => ({
      unitPrice: effectiveUnitPrice(item.product.price, item.unitPriceOverride),
      quantity: item.quantity,
      discountPercent: pricing.canApplyDiscount ? item.discountPercent : 0,
    })),
    saleTaxSettings,
  );
  const effectiveCartDiscount =
    saleTaxSettings.cartDiscountEnabled && pricing.canApplyDiscount ? cartDiscountPercent : 0;
  const saleTotals = calculateSaleTotals({ subtotal, discountPercent: effectiveCartDiscount }, saleTaxSettings);
  const vatAmount = saleTotals.vatAmount;
  const total = saleTotals.total;
  const saleVatActive = isVatActive(saleTaxSettings);

  const actualPaidAmount = paymentMode === 'full' 
    ? total 
    : paymentMode === 'credit' 
      ? 0 
      : Number(amountPaidInput) || 0;

  const balanceRemaining = Math.max(0, total - actualPaidAmount);

  // Check if credit / partial requires customer selection
  const isCreditOrPartial = paymentMode === 'credit' || (paymentMode === 'partial' && balanceRemaining > 0);
  const needsDueDate =
    pricing.canUsePartialPayment &&
    (paymentMode === 'credit' || (paymentMode === 'partial' && balanceRemaining > 0));
  const isCustomerMissingForCredit = isCreditOrPartial && !selectedCustomer;

  React.useEffect(() => {
    if (needsDueDate && !paymentDueDate) {
      setPaymentDueDate(defaultCreditDueDate(30));
    } else if (!needsDueDate) {
      setPaymentDueDate('');
    }
  }, [needsDueDate, paymentDueDate]);

  React.useEffect(() => {
    if (paymentMode === 'partial') {
      const t = window.setTimeout(() => partialAmountRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [paymentMode]);

  const cartItemCount = cart.reduce((n, i) => n + i.quantity, 0);

  const goToPayStep = () => {
    if (cart.length === 0) return;
    setPosStep('pay');
    setMobileCartOpen(true);
  };

  const goToCartStep = () => setPosStep('cart');

  const setPartialAmount = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    setAmountPaidInput(cleaned);
    setValidationError(null);
  };

  const buildCurrentSale = useCallback(
    (finalize: boolean, clientTransactionId?: string, modeOverride?: 'full' | 'partial' | 'credit') => {
      const mode = modeOverride ?? paymentMode;
      return buildSaleFromCart({
        cart,
        customer: selectedCustomer,
        paymentMode: mode,
        paymentMethod: selectedPaymentMethod,
        amountPaid: mode === 'full' ? total : mode === 'credit' ? 0 : Number(amountPaidInput) || 0,
        taxSettings: saleTaxSettings,
        cashierName,
        clientTransactionId: clientTransactionId ?? openDraftIdRef.current ?? undefined,
        finalize,
        isSw,
        branchId: activeBranchId ?? undefined,
        cartDiscountPercent: pricing.canApplyDiscount ? cartDiscountPercent : 0,
        paymentDueDate:
          mode === 'credit' || (mode === 'partial' && (Number(amountPaidInput) || 0) < total)
            ? paymentDueDate
            : undefined,
        receiptNumber: finalize ? generateReceiptNumber(taxSettings) : undefined,
      });
    },
    [cart, selectedCustomer, paymentMode, selectedPaymentMethod, amountPaidInput, saleTaxSettings, cashierName, isSw, activeBranchId, cartDiscountPercent, pricing.canApplyDiscount, paymentDueDate, total, taxSettings],
  );

  const handleSaveAndNext = async () => {
    setValidationError(null);
    if (cart.length === 0) {
      setValidationError(isSw ? 'Kikapu hakina bidhaa.' : 'Cart is empty.');
      return;
    }
    if (balanceRemaining > 0) {
      const dueErr = validatePaymentDueDate(paymentDueDate, isSw);
      if (dueErr) {
        setValidationError(dueErr);
        return;
      }
    }
    if (!openDraftIdRef.current) {
      openDraftIdRef.current = generateClientTransactionId();
    }
    const draftId = openDraftIdRef.current;
    savingPendingRef.current = true;
    openDraftIdRef.current = null;
    if (tenantId) {
      removeOpenTransaction(tenantId, draftId);
    }
    const sale = buildCurrentSale(false, draftId);
    sale.traEfdSignature = undefined;
    try {
      if (onSavePending) {
        await onSavePending(sale);
      } else {
        onCompleteSale(sale);
      }
      setCart([]);
      setAmountPaidInput('');
      setSelectedCustomerId('');
      setPosStep('cart');
      setMobileCartOpen(false);
      resumeCustomerPinRef.current = null;
      setValidationError(null);
    } finally {
      savingPendingRef.current = false;
    }
  };

  const clearPosSession = () => {
    setCart([]);
    setAmountPaidInput('');
    setPaymentDueDate('');
    setSelectedCustomerId('');
    setPosStep('cart');
    setMobileCartOpen(false);
    openDraftIdRef.current = null;
    resumeSaleIdRef.current = null;
    onResumeConsumed?.();
  };

  // Execute Sale & Generate TRA EFD Receipt with Strict Validation
  const handleExecuteSale = async () => {
    setValidationError(null);

    if (cart.length === 0) {
      setValidationError(isSw ? 'Kikapu hakina bidhaa.' : 'Cart is empty.');
      return;
    }

    // Partial: require a clear amount paid now (0 < amount < total); ≥ total → treat as full
    let effectiveMode = paymentMode;
    if (paymentMode === 'partial') {
      const paidNow = Number(amountPaidInput);
      if (!amountPaidInput.trim() || Number.isNaN(paidNow) || paidNow <= 0) {
        setValidationError(
          isSw
            ? 'Ingiza kiasi anacholipa mteja sasa (malipo ya awamu).'
            : 'Enter the amount the customer is paying now (partial payment).',
        );
        setPosStep('pay');
        setMobileCartOpen(true);
        setTimeout(() => partialAmountRef.current?.focus(), 80);
        return;
      }
      if (paidNow >= total) {
        effectiveMode = 'full';
        setPaymentMode('full');
        setAmountPaidInput('');
      }
    }

    const balanceForValidation =
      effectiveMode === 'full' ? 0 : effectiveMode === 'credit' ? total : Math.max(0, total - (Number(amountPaidInput) || 0));
    const creditOrPartialNow = effectiveMode === 'credit' || (effectiveMode === 'partial' && balanceForValidation > 0);

    // 1. Strict Requirement: If customer needs credit or partial payment, NO SALE CAN BE DONE until customer is selected or created!
    if (creditOrPartialNow) {
      if (!selectedCustomer) {
        setValidationError(
          isSw 
            ? '⚠️ MTEJA ANAHITAJIKA: Haiwezekani kufanya mauzo ya mkopo (Credit) au malipo ya awamu (Partial) bila kumchagua au kumsajili mteja ili kufuatilia madeni!'
            : '⚠️ CUSTOMER REQUIRED: Credit and partial sales cannot be completed without selecting or creating a customer to track receivables!'
        );
        setIsNewCustomerModalOpen(true);
        return;
      }

      // Check credit limit
      if (selectedCustomer.balance + balanceForValidation > selectedCustomer.creditLimit) {
        const proceed = confirm(
          isSw
            ? `⚠️ Mteja huyu (${selectedCustomer.name}) atazidi kikomo cha mkopo (${formatTSh(selectedCustomer.creditLimit)}). Salio jipya litakuwa ${formatTSh(selectedCustomer.balance + balanceForValidation)}. Je, unathibitisha kutoa mkopo wa ziada?`
            : `⚠️ Customer credit limit (${formatTSh(selectedCustomer.creditLimit)}) will be exceeded. New balance will be ${formatTSh(selectedCustomer.balance + balanceForValidation)}. Confirm supervisor override?`
        );
        if (!proceed) return;
      }
    }

    if (balanceForValidation > 0) {
      const dueErr = validatePaymentDueDate(paymentDueDate, isSw);
      if (dueErr) {
        setValidationError(dueErr);
        return;
      }
    }

    // 2. Double check stock constraints before committing
    for (const item of cart) {
      const liveProd = products.find(p => p.id === item.product.id);
      if (liveProd && item.quantity > liveProd.stock) {
        setValidationError(
          isSw
            ? `⚠️ Hifadhi haitoshi kwa "${liveProd.name}". Umeomba ${item.quantity}, lakini kuna ${liveProd.stock} tu stoo.`
            : `⚠️ Insufficient stock for "${liveProd.name}". Requested ${item.quantity}, but only ${liveProd.stock} available.`
        );
        return;
      }
    }

    const receiptNumber = generateReceiptNumber(taxSettings);
    const sale = buildCurrentSale(true, undefined, effectiveMode);
    sale.receiptNumber = receiptNumber;
    if (wantTraFiscal) {
      sale.traEfdSignature = generateTraSignature(taxSettings, receiptNumber);
    }
    if (selectedPaymentMethod === 'mpesa' && !sale.payments[0]?.reference) {
      sale.payments[0].reference = `MP-${Math.random().toString(36).substring(7).toUpperCase()}`;
    }

    const finishSale = async () => {
      let traReceipt: TraReceipt | null = null;
      if (wantTraFiscal && saleVatActive) {
        traReceipt = await issueFromSale(
          sale,
          taxSettings.receiptBusinessName || currentUser?.businessName || 'Shop',
          { customerMobile: selectedCustomer?.phone },
        );
      }
      setLastTraReceipt(traReceipt);
      setLastCompletedSale(sale);
      clearPosSession();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    };

    if (resumeSaleIdRef.current && onFinalizeResume) {
      try {
        if (tenantId) {
          const draftId = openDraftIdRef.current ?? resumeSaleIdRef.current;
          removeOpenTransaction(tenantId, draftId);
          removeOpenTransaction(tenantId, resumeSaleIdRef.current);
        }
        await onFinalizeResume(resumeSaleIdRef.current, sale);
        await finishSale();
      } catch {
        setValidationError(isSw ? 'Imeshindikana kukamilisha mauzo.' : 'Failed to finalize pending sale.');
      }
      return;
    }

    if (tenantId) {
      const draftId = openDraftIdRef.current ?? sale.id;
      removeOpenTransaction(tenantId, draftId);
      removeOpenTransaction(tenantId, sale.id);
    }

    onCompleteSale(sale);
    await finishSale();
  };

  // Handler: Quick Create Customer from POS and Auto-Select
  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.phone || isCreatingCustomer) return;

    setIsCreatingCustomer(true);
    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-indigo-600', 'bg-teal-600'];
    const payload = customerToApiPayload({
      name: newCustomerForm.name,
      phone: newCustomerForm.phone,
      email: newCustomerForm.email || `${newCustomerForm.name.toLowerCase().replace(/\s+/g, '')}@duka.tz`,
      address: newCustomerForm.address || 'Dar es Salaam, Tanzania',
      creditLimit: Number(newCustomerForm.creditLimit) || 300000,
      balance: 0,
      notes: newCustomerForm.notes || 'Registered at POS Register',
    }, activeBranchId);

    let created: Customer;
    try {
      const raw = await api.createCustomer(payload);
      created = {
        ...mapCustomer(raw as Record<string, unknown>),
        branchId: (raw as { branch_id?: string }).branch_id ?? activeBranchId ?? undefined,
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        notes: newCustomerForm.notes || 'Registered at POS Register',
        riskScore: 'Low',
        dunningStage: 'cleared',
        daysOverdue: 0,
        lastPurchaseDate: '',
        totalPurchases: 0,
        loyaltyPoints: 50,
      };
      await onCustomersChanged?.();
    } catch (err) {
      setIsCreatingCustomer(false);
      setValidationError(
        isSw
          ? `Imeshindwa kuhifadhi mteja kwenye seva: ${(err as Error).message}. Hakikisha umeingia na mtandao unafanya kazi.`
          : `Could not save customer to server: ${(err as Error).message}. Check you are logged in and online.`,
      );
      return;
    }

    if (setCustomers) {
      setCustomers(prev => {
        const scoped = filterByActiveBranch(prev, activeBranchId, branches);
        return [created, ...scoped.filter(c => c.phone !== created.phone)];
      });
    }

    setSelectedCustomerId(created.id);
    setIsNewCustomerModalOpen(false);
    setValidationError(null);
    setIsCreatingCustomer(false);
    setNewCustomerForm({
      name: '',
      phone: '+255 ',
      email: '',
      address: 'Kariakoo, Dar es Salaam',
      creditLimit: '300000',
      notes: 'Registered at POS Register',
    });

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  if (requiresOpenShift && !openShift) {
    return (
      <div className="max-w-lg mx-auto mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#323130]">
              {isSw ? 'Fungua zamu kabla ya POS' : 'Open your shift before POS'}
            </h2>
            <p className="text-xs text-[#605E5C] mt-1">
              {isSw
                ? 'Mauzo yanahitaji zamu iliyofunguliwa. Weka float ya kuanza kisha fungua.'
                : 'Sales require an open shift. Enter opening float, then open your shift.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={openingFloat}
            onChange={e => setOpeningFloat(e.target.value)}
            placeholder={isSw ? 'Float ya kuanza' : 'Opening float'}
            className="w-36 px-3 py-2 rounded-xl border border-[#E1DFDD] text-sm bg-white"
          />
          <button
            type="button"
            onClick={() => {
              const session = openCashierShift({
                tenantId: tenantKey,
                staffId: staffKey,
                cashierName: cashierName || currentUser?.name || 'Cashier',
                openingFloat: Number(openingFloat) || 0,
              });
              setOpenShift(session);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F2347] text-white text-sm font-bold cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            {isSw ? 'Fungua Zamu' : 'Open Shift'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{minHeight: 'calc(100vh - 80px)'}}>

      {/* ═══ COMPACT TOP BAR ══════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-2 px-1 py-1.5 border-b border-[#E1DFDD] bg-white/80 backdrop-blur-sm mb-2">
        {/* Left: home + title */}
        <div className="flex items-center gap-2 min-w-0">
          {onExitPOS && (
            <button
              type="button"
              onClick={onExitPOS}
              title={isSw ? 'Rudi menyu kuu' : 'Back to main menu'}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#EDEBE9] bg-[#F8F8F8] hover:bg-[#EDEBE9] text-[#6264A7] cursor-pointer shrink-0"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
          <span className="text-sm sm:text-base font-extrabold text-[#323130] flex items-center gap-1.5 shrink-0 truncate">
            {workplace.icon} {isSw ? workplace.pos_title_sw : workplace.pos_title_en}
          </span>
          <span className="hidden md:inline text-[11px] text-[#605E5C] font-medium truncate">
            {currentUser?.businessName || ''}
            {tableContextLabel && <span className="ml-2 font-bold text-teal-700">🍽️ {tableContextLabel}</span>}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#107C10]/10 text-[#107C10] border border-[#107C10]/30 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            {getComplianceStatusLabel(taxSettings, isSw)}
          </span>
          {requiresOpenShift && openShift && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
              <Unlock className="w-3 h-3" />
              {isSw ? 'Zamu wazi' : 'Shift'} · {new Date(openShift.openedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </span>
          )}
        </div>
        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onExitPOS && (
            <button
              type="button"
              onClick={onExitPOS}
              className="px-2.5 py-1.5 rounded-lg bg-[#F3F2F1] hover:bg-[#EDEBE9] text-[#323130] border border-[#E1DFDD] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#6264A7]" />
              <span className="hidden sm:inline">{isSw ? 'Menyu' : 'Menu'}</span>
            </button>
          )}
          {onNavigateToReceivables && (
            <button type="button" onClick={onNavigateToReceivables}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#D13438] border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer">
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSw ? 'Madeni' : 'Receivables'}</span>
            </button>
          )}
          {requiresOpenShift && openShift && (
            <button type="button" onClick={() => { closeCashierShift({ tenantId: tenantKey, staffId: staffKey }); setOpenShift(null); }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSw ? 'Funga' : 'Close Shift'}</span>
            </button>
          )}
        </div>
      </div>

      {/* STOCK WARNING BANNER */}
      {stockWarningMessage && (
        <div className="mx-1 mb-2 p-2.5 bg-amber-50 border border-amber-400 rounded-lg text-xs text-amber-900 font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{stockWarningMessage}</span>
          </div>
          <button onClick={() => setStockWarningMessage(null)} className="text-amber-800 hover:text-black ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VALIDATION ERROR BANNER */}
      {validationError && (
        <div className="mx-1 mb-2 p-2.5 bg-rose-50 border border-rose-400 rounded-lg text-xs text-rose-900 font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)} className="text-rose-800 hover:text-black ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* POS LAYOUT: Odoo-style — narrow cart (left on desktop) + wide product grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-3 pb-[4.5rem] lg:pb-0" style={{minHeight: 0, alignItems: 'start'}}>
        {/* PRODUCT CATALOG — wide column on desktop (right side) */}
        <div className="lg:col-span-9 lg:col-start-4 space-y-3 min-w-0">
          <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-[#E1DFDD] shadow-xs space-y-2 sticky top-0 z-[1]">
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#605E5C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  placeholder={t('searchProducts')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F3F2F1] border border-transparent focus:border-[#0078D4] focus:bg-white rounded-xl text-xs outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-[#6264A7] hover:bg-[#555793] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title={isSw ? 'Skani QR / Barcode' : 'Scan QR or Barcode'}
              >
                <Camera className="w-4 h-4 text-emerald-300" />
                <span className="hidden sm:inline">{isSw ? 'Skani' : 'Scan'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap text-[11px] font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#6264A7] text-white shadow-xs'
                      : 'bg-[#F3F2F1] text-[#605E5C] hover:text-[#323130]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5 overflow-y-auto overscroll-contain pr-0.5" style={{maxHeight: 'calc(100dvh - 11rem)'}}>
            {filteredProducts.map(prod => {
              const isOutOfStock = prod.stock <= 0;
              const isLowStock = prod.stock > 0 && prod.stock <= prod.reorderPoint;
              const cartItem = cart.find(c => c.product.id === prod.id);
              const inCartQty = cartItem?.quantity || 0;
              const remainingAfterCart = prod.stock - inCartQty;

              return (
                <button
                  key={prod.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => !isOutOfStock && handleAddToCart(prod)}
                  className={`text-left bg-white rounded-lg border transition-all flex flex-col overflow-hidden select-none isolate h-full ${
                    isOutOfStock
                      ? 'border-rose-200 bg-rose-50/40 opacity-70 cursor-not-allowed'
                      : 'border-[#E1DFDD] hover:border-[#714B67] hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div className="relative bg-white">
                    <ProductImageThumb src={prod.imageUrl} name={prod.name} size="posOdoo" />
                    {inCartQty > 0 && (
                      <span className="absolute top-1.5 left-1.5 min-w-[1.35rem] h-5 px-1 rounded-full bg-[#6264A7] text-white text-[10px] font-black flex items-center justify-center shadow">
                        {inCartQty}
                      </span>
                    )}
                    {isOutOfStock ? (
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                        {isSw ? 'HAKUNA' : 'OUT'}
                      </span>
                    ) : (
                      <span className={`absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${
                        isLowStock ? 'bg-amber-500/90 text-white' : 'bg-black/55 text-white'
                      }`}>
                        {prod.stock} {prod.unit}
                      </span>
                    )}
                  </div>
                  <div className="p-2 sm:p-2.5 flex flex-col flex-1 gap-1 border-t border-[#F3F2F1]">
                    <h4 className="text-[10px] sm:text-[11px] font-semibold text-[#323130] line-clamp-3 leading-tight uppercase tracking-tight min-h-[2.8em]">
                      {prod.name}
                    </h4>
                    <ProductMetaBadges
                      product={prod}
                      businessType={businessType}
                      language={language}
                      variant="line"
                      max={1}
                      className="hidden md:flex"
                    />
                    <div className="mt-auto flex items-end justify-between gap-1 pt-1">
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-extrabold text-[#714B67] tabular-nums leading-none">
                          {formatTSh(prod.price)}
                        </p>
                        <p className="text-[9px] text-[#8A8886] font-mono truncate mt-0.5">{prod.sku}</p>
                      </div>
                      {!isOutOfStock && (
                        <span className="w-8 h-8 rounded-md bg-[#714B67] text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Plus className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    {inCartQty > 0 && (
                      <div className="text-[9px] font-semibold text-[#6264A7]">
                        {isSw ? `Kikapu · baki ${remainingAfterCart}` : `In cart · left ${remainingAfterCart}`}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CART — desktop (narrow left column, Odoo-style) */}
        <div
          className="hidden lg:flex lg:col-span-3 lg:col-start-1 lg:row-start-1 bg-[#F8F8F8] rounded-lg border border-[#E1DFDD] shadow-xs flex-col overflow-hidden"
          style={{height: 'calc(100dvh - 8.5rem)', minHeight: '480px'}}
        >
          <div className="px-3 pt-3 pb-2 border-b border-[#F3F2F1] shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={goToCartStep}
              className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                posStep === 'cart' ? 'bg-[#6264A7] text-white' : 'bg-[#F3F2F1] text-[#605E5C]'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                {isSw ? 'Bidhaa' : 'Items'}
                {cart.length > 0 && <span className="opacity-90">({cart.length})</span>}
              </span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={goToPayStep}
              className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                posStep === 'pay' ? 'bg-[#107C10] text-white' : 'bg-[#F3F2F1] text-[#605E5C]'
              }`}
            >
              {isSw ? 'Malipo' : 'Pay'}
            </button>
            <span className="text-[11px] font-extrabold text-[#0078D4] shrink-0 tabular-nums pl-1">
              {formatTSh(total)}
            </span>
          </div>

          {posStep === 'cart' ? (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#605E5C]">
                    <ShoppingBag className="w-8 h-8 text-[#C8C6C4] mx-auto mb-2" />
                    {t('cartEmpty')}
                  </div>
                ) : (
                  cart.map(item => {
                    const availableStock = item.product.stock;
                    const isExceeding = item.quantity > availableStock;
                    const lineTotal = effectiveUnitPrice(item.product.price, item.unitPriceOverride) * item.quantity * (1 - (item.discountPercent || 0) / 100);
                    return (
                      <div
                        key={item.product.id}
                        className={`p-2.5 rounded-xl border text-xs ${
                          isExceeding ? 'bg-rose-50 border-rose-300' : 'bg-[#FAF9F8] border-[#EDEBE9]'
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <ProductImageThumb src={item.product.imageUrl} name={item.product.name} size="md" className="rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#323130] line-clamp-2 leading-snug">{item.product.name}</div>
                            <div className="text-[10px] text-[#605E5C] mt-0.5 flex flex-wrap gap-x-2">
                              <span>{formatTSh(item.product.price)} / {item.product.unit}</span>
                              <span className="font-semibold text-emerald-700">Stoo: {availableStock}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                              <button type="button" onClick={() => handleUpdateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-[#C8C6C4] flex items-center justify-center cursor-pointer">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={availableStock}
                                value={item.quantity}
                                onChange={e => handleDirectQtyInput(item.product.id, e.target.value)}
                                className="w-10 text-center font-bold text-xs bg-white border border-[#EDEBE9] rounded-lg py-1 outline-none"
                              />
                              <button type="button" onClick={() => handleUpdateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-[#C8C6C4] flex items-center justify-center cursor-pointer">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <span className="ml-auto text-[11px] font-extrabold text-[#323130] tabular-nums">
                                {formatTSh(lineTotal)}
                              </span>
                              <button type="button" onClick={() => handleRemoveFromCart(item.product.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {pricing.canApplyDiscount && (
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EDEBE9]/80">
                                <span className="text-[10px] font-semibold text-[#605E5C]">{isSw ? 'Punguzo %' : 'Discount %'}</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={pricing.canApproveHighDiscount ? 100 : taxSettings.maxDiscountPercent}
                                  value={item.discountPercent || ''}
                                  placeholder="0"
                                  onChange={e => handleUpdateDiscount(item.product.id, e.target.value)}
                                  className="w-14 text-center text-[10px] font-bold bg-white border border-[#EDEBE9] rounded py-0.5 outline-none"
                                />
                              </div>
                            )}
                            {pricing.canOverridePrice && (
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EDEBE9]/80">
                                <span className="text-[10px] font-semibold text-[#605E5C]">{isSw ? 'Bei' : 'Unit price'}</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.unitPriceOverride ?? item.product.price}
                                  onChange={e => handleUpdateUnitPrice(item.product.id, e.target.value)}
                                  className="w-20 text-center text-[10px] font-bold bg-white border border-[#EDEBE9] rounded py-0.5 outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-3 py-2 border-t border-[#F3F2F1] space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#323130]">{isSw ? 'Mteja' : 'Customer'}</label>
                  <button type="button" onClick={() => setIsNewCustomerModalOpen(true)} className="text-[11px] font-bold text-[#0078D4] flex items-center gap-1 cursor-pointer">
                    <UserPlus className="w-3.5 h-3.5" /> {isSw ? 'Mpya' : 'New'}
                  </button>
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={e => { setSelectedCustomerId(e.target.value); setValidationError(null); }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#F3F2F1] border border-[#EDEBE9] outline-none focus:border-[#0078D4]"
                >
                  <option value="">{isSw ? 'Mteja wa Taslimu' : 'Walk-in / Cash'}</option>
                  {selectedCustomer && !branchCustomers.some(c => c.id === selectedCustomer.id) && (
                    <option value={selectedCustomer.id}>{selectedCustomer.name}</option>
                  )}
                  {branchCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} · {formatTSh(c.balance)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={goToPayStep}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#107C10] to-[#0078D4] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {isSw ? 'Endelea Malipo' : 'Continue to Pay'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
              <button type="button" onClick={goToCartStep} className="text-[11px] font-bold text-[#6264A7] flex items-center gap-1 cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" /> {isSw ? 'Rudi kwa bidhaa' : 'Back to items'}
              </button>

              <div className="rounded-xl border border-[#EDEBE9] bg-[#FAF9F8] p-2.5 max-h-40 overflow-y-auto space-y-2">
                <div className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wide">
                  {isSw ? `Bidhaa zilizochaguliwa (${cart.length})` : `Selected items (${cart.length})`}
                </div>
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2.5 text-[11px]">
                    <ProductImageThumb src={item.product.imageUrl} name={item.product.name} size="sm" className="rounded-lg" />
                    <span className="flex-1 min-w-0 font-semibold text-[#323130] line-clamp-2">{item.product.name}</span>
                    <span className="text-[#605E5C] shrink-0 font-bold">×{item.quantity}</span>
                    <span className="font-extrabold text-[#323130] shrink-0 tabular-nums">{formatTSh(effectiveUnitPrice(item.product.price, item.unitPriceOverride) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs text-[#605E5C]">
                <div className="flex justify-between"><span>{t('subtotal')}:</span><span className="font-semibold text-[#323130]">{formatTSh(subtotal)}</span></div>
                {saleVatActive && saleTaxSettings.showVatOnReceipt && (
                  <div className="flex justify-between"><span>{formatVatLabel(saleTaxSettings, isSw)}:</span><span className="font-semibold text-[#323130]">{formatTSh(vatAmount)}</span></div>
                )}
                {canToggleSaleVat && (
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="font-semibold text-[#323130]">{isSw ? 'VAT 18%' : 'VAT 18%'}</span>
                    <div className="grid grid-cols-2 gap-1 bg-[#F3F2F1] p-0.5 rounded-lg">
                      <button type="button" onClick={() => setApplyVatThisSale(true)} className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${applyVatThisSale ? 'bg-[#107C10] text-white' : 'text-[#605E5C]'}`}>{isSw ? 'Na VAT' : 'With VAT'}</button>
                      <button type="button" onClick={() => setApplyVatThisSale(false)} className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${!applyVatThisSale ? 'bg-[#323130] text-white' : 'text-[#605E5C]'}`}>{isSw ? 'Bila VAT' : 'No VAT'}</button>
                    </div>
                  </div>
                )}
                {canIssueTraFiscal && (
                  <div className="py-1.5 space-y-1">
                    <label className="block text-[11px] font-bold text-[#323130]">
                      {isSw ? 'Aina ya Risiti' : 'Receipt Type'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setReceiptType('tra_fiscal'); setApplyVatThisSale(true); }}
                        className={`py-2 rounded-lg text-[10px] font-bold border cursor-pointer flex items-center justify-center gap-1 ${
                          receiptType === 'tra_fiscal'
                            ? 'bg-[#107C10] text-white border-[#107C10]'
                            : 'bg-white text-[#605E5C] border-[#EDEBE9]'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {isSw ? 'TRA Fiscal' : 'TRA Fiscal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptType('standard')}
                        className={`py-2 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          receiptType === 'standard'
                            ? 'bg-[#323130] text-white border-[#323130]'
                            : 'bg-white text-[#605E5C] border-[#EDEBE9]'
                        }`}
                      >
                        {isSw ? 'Standard' : 'Standard'}
                      </button>
                    </div>
                    <p className="text-[9px] text-[#605E5C]">
                      {receiptType === 'tra_fiscal'
                        ? (isSw ? 'Inatumwa TRA EFD · risiti ya kisheria + QR' : 'Sent to TRA EFD · legal slip + QR')
                        : (isSw ? 'Risiti ya kawaida — haitumwi TRA' : 'Normal receipt — not sent to TRA')}
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-[#323130] pt-1 border-t border-[#EDEBE9]">
                  <span>{t('totalPayable')}:</span>
                  <span className="text-[#0078D4] text-base tabular-nums">{formatTSh(total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#323130] mb-1">
                  {isSw ? 'Mteja' : 'Customer'}{isCreditOrPartial && <span className="text-[#D13438]"> *</span>}
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={e => { setSelectedCustomerId(e.target.value); setValidationError(null); }}
                  className={`w-full px-3 py-2 text-xs rounded-lg outline-none ${
                    isCustomerMissingForCredit ? 'bg-rose-50 border-2 border-rose-400' : 'bg-[#F3F2F1] border border-[#EDEBE9]'
                  }`}
                >
                  <option value="">{isSw ? 'Mteja wa Taslimu' : 'Walk-in / Cash'}</option>
                  {branchCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} · Deni {formatTSh(c.balance)}</option>
                  ))}
                </select>
                {isCustomerMissingForCredit && (
                  <p className="mt-1 text-[10px] text-rose-700 font-semibold">{isSw ? 'Chagua mteja kwa mkopo/awamu' : 'Select a customer for credit/partial'}</p>
                )}
              </div>

              {pricing.canUsePartialPayment && (
                <div>
                  <label className="block text-[11px] font-bold text-[#323130] mb-1">{t('paymentType')}</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(['full', 'partial', 'credit'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setPaymentMode(mode);
                          setValidationError(null);
                          if (mode !== 'partial') setAmountPaidInput('');
                        }}
                        className={`py-2 rounded-lg font-semibold cursor-pointer ${
                          paymentMode === mode ? 'bg-[#6264A7] text-white font-bold' : 'bg-[#F3F2F1] text-[#605E5C]'
                        }`}
                      >
                        {mode === 'full' ? (isSw ? 'Kamili' : 'Full') : mode === 'partial' ? (isSw ? 'Awamu' : 'Partial') : (isSw ? 'Mkopo' : 'Credit')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMode !== 'credit' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#323130] mb-1">{isSw ? 'Njia ya Malipo' : 'Payment Method'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    {[
                      { key: 'cash', label: isSw ? 'Taslimu' : 'Cash' },
                      { key: 'mpesa', label: 'M-Pesa' },
                      { key: 'airtel', label: 'Airtel' },
                      { key: 'card', label: isSw ? 'Kadi' : 'Card' },
                    ].map(m => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m.key as PaymentMethod)}
                        className={`py-2 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                          selectedPaymentMethod === m.key
                            ? 'bg-[#0078D4] text-white border-[#0078D4]'
                            : 'bg-[#FAF9F8] border-[#EDEBE9] text-[#605E5C]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {needsDueDate && (
                <div className="p-2 bg-orange-50/70 rounded-lg border border-orange-200 space-y-1">
                  <label className="block text-[11px] font-bold text-[#323130]">
                    {isSw ? 'Tarehe ya Malipo *' : 'Payment Due Date *'}
                  </label>
                  <input
                    type="date"
                    min={todayIsoDate()}
                    value={paymentDueDate}
                    onChange={e => {
                      const next = e.target.value;
                      setPaymentDueDate(next);
                      setValidationError(next && validatePaymentDueDate(next, isSw) ? validatePaymentDueDate(next, isSw) : null);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#EDEBE9] rounded-lg outline-none font-semibold"
                  />
                </div>
              )}
              </div>

              {/* Sticky footer: partial amount always fully visible + pay actions */}
              <div className="shrink-0 border-t border-[#E1DFDD] bg-white px-3 py-3 space-y-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
              {paymentMode === 'partial' && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-extrabold text-amber-950">
                      {isSw ? 'Kiasi anacholipa SASA' : 'Amount paying NOW'}
                    </div>
                    <div className="text-[11px] font-bold text-[#0078D4] tabular-nums">{formatTSh(total)}</div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#605E5C]">TSh</span>
                    <input
                      ref={partialAmountRef}
                      type="text"
                      inputMode="decimal"
                      placeholder={isSw ? 'Andika kiasi...' : 'Enter amount...'}
                      value={amountPaidInput}
                      onChange={e => setPartialAmount(e.target.value)}
                      className="w-full pl-12 pr-3 py-3 text-lg font-extrabold bg-white border-2 border-amber-400 rounded-xl focus:border-[#0078D4] outline-none text-right text-[#0078D4] tabular-nums"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPartialAmount(String(Math.round(total / 2)))} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white border border-amber-200 text-amber-900 cursor-pointer">
                      {isSw ? 'Nusu' : 'Half'}
                    </button>
                    <button type="button" onClick={() => setPartialAmount('')} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-white border border-amber-200 text-amber-900 cursor-pointer">
                      {isSw ? 'Futa' : 'Clear'}
                    </button>
                  </div>
                  {Number(amountPaidInput) > 0 && Number(amountPaidInput) < total && (
                    <div className="flex justify-between rounded-lg bg-rose-100 border border-rose-300 px-2.5 py-1.5 text-[11px]">
                      <span className="font-bold text-rose-800">{isSw ? 'Deni litakalobaki' : 'Balance remaining'}</span>
                      <span className="font-extrabold text-rose-700 tabular-nums">{formatTSh(balanceRemaining)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleSaveAndNext}
                  className={`py-3 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 ${
                    cart.length === 0 ? 'bg-[#EDEBE9] text-[#A19F9D]' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{isSw ? 'Hifadhi' : 'Park'}</span>
                  <span className="text-[9px] opacity-90">{isSw ? 'Malipo baadaye' : 'Pay later'}</span>
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleExecuteSale}
                  className={`py-3 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 ${
                    cart.length === 0
                      ? 'bg-[#EDEBE9] text-[#A19F9D]'
                      : isCustomerMissingForCredit
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white cursor-pointer'
                        : 'bg-gradient-to-r from-[#107C10] to-[#0078D4] text-white cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {isCustomerMissingForCredit ? (isSw ? 'Chagua Mteja' : 'Select Customer') : (isSw ? 'Lipa sasa' : 'Take Payment')}
                  </span>
                  <span className="text-[9px] opacity-90">{formatTSh(paymentMode === 'partial' ? Math.min(Number(amountPaidInput) || 0, total) : paymentMode === 'credit' ? 0 : total)}</span>
                </button>
              </div>
              {pendingCount > 0 && onOpenPending && (
                <button type="button" onClick={onOpenPending} className="w-full py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer flex items-center justify-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {isSw ? `${pendingCount} yanasubiri malipo` : `${pendingCount} awaiting payment`}
                </button>
              )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky cart bar (above bottom nav) */}
      <div className="lg:hidden fixed left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none" style={{ bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          type="button"
          onClick={() => { setMobileCartOpen(true); if (cart.length === 0) setPosStep('cart'); }}
          className="pointer-events-auto w-full max-w-lg mx-auto flex items-center gap-3 rounded-2xl bg-[#24284A] text-white px-4 py-3 shadow-xl border border-white/10 cursor-pointer"
        >
          <span className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[1.1rem] h-4 px-0.5 rounded-full bg-amber-400 text-[#24284A] text-[9px] font-black flex items-center justify-center">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </span>
          <span className="flex-1 text-left text-xs font-bold">
            {cart.length === 0
              ? (isSw ? 'Kikapu kitupu' : 'Cart empty')
              : (isSw ? `${cart.length} bidhaa` : `${cart.length} items`)}
          </span>
          <span className="text-sm font-extrabold tabular-nums">{formatTSh(total)}</span>
          <ChevronUp className="w-4 h-4 opacity-80" />
        </button>
      </div>

      {/* Mobile cart / pay bottom sheet */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <button type="button" className="absolute inset-0 bg-black/45 cursor-pointer" aria-label="Close" onClick={() => setMobileCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[88dvh] flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#C8C6C4]" />
            </div>
            <div className="px-4 pb-2 flex items-center justify-between shrink-0 border-b border-[#F3F2F1]">
              <div className="flex gap-1 p-0.5 bg-[#F3F2F1] rounded-xl">
                <button type="button" onClick={goToCartStep} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${posStep === 'cart' ? 'bg-white shadow-sm text-[#323130]' : 'text-[#605E5C]'}`}>
                  {isSw ? 'Bidhaa' : 'Items'}
                </button>
                <button type="button" disabled={cart.length === 0} onClick={goToPayStep} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-40 ${posStep === 'pay' ? 'bg-white shadow-sm text-[#107C10]' : 'text-[#605E5C]'}`}>
                  {isSw ? 'Malipo' : 'Pay'}
                </button>
              </div>
              <button type="button" onClick={() => setMobileCartOpen(false)} className="p-2 rounded-lg text-[#605E5C] cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {posStep === 'cart' ? (
                <>
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#605E5C]">{t('cartEmpty')}</div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="flex gap-3 p-2.5 rounded-xl bg-[#FAF9F8] border border-[#EDEBE9]">
                        <ProductImageThumb src={item.product.imageUrl} name={item.product.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#323130] line-clamp-2">{item.product.name}</div>
                          <div className="text-[10px] text-[#605E5C]">{formatTSh(item.product.price)}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button type="button" onClick={() => handleUpdateQty(item.product.id, -1)} className="w-8 h-8 rounded-lg border bg-white flex items-center justify-center cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                            <button type="button" onClick={() => handleUpdateQty(item.product.id, 1)} className="w-8 h-8 rounded-lg border bg-white flex items-center justify-center cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleRemoveFromCart(item.product.id)} className="ml-auto p-2 text-rose-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-[#F3F2F1] border border-[#EDEBE9]"
                  >
                    <option value="">{isSw ? 'Mteja wa Taslimu' : 'Walk-in / Cash'}</option>
                    {branchCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={goToPayStep}
                    className="w-full py-3.5 rounded-2xl bg-[#107C10] text-white font-bold text-sm disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSw ? 'Endelea Malipo' : 'Continue to Pay'} <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-[#FAF9F8] border border-[#EDEBE9] p-2 space-y-1 max-h-24 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex justify-between text-[11px] gap-2">
                        <span className="truncate font-semibold">{item.product.name} ×{item.quantity}</span>
                        <span className="font-bold shrink-0 tabular-nums">{formatTSh(effectiveUnitPrice(item.product.price, item.unitPriceOverride) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-extrabold">
                    <span>{t('totalPayable')}</span>
                    <span className="text-[#0078D4] tabular-nums">{formatTSh(total)}</span>
                  </div>
                  {pricing.canUsePartialPayment && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['full', 'partial', 'credit'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => { setPaymentMode(mode); if (mode !== 'partial') setAmountPaidInput(''); }}
                          className={`py-2.5 rounded-xl text-[11px] font-bold cursor-pointer ${paymentMode === mode ? 'bg-[#6264A7] text-white' : 'bg-[#F3F2F1] text-[#605E5C]'}`}
                        >
                          {mode === 'full' ? (isSw ? 'Kamili' : 'Full') : mode === 'partial' ? (isSw ? 'Awamu' : 'Partial') : (isSw ? 'Mkopo' : 'Credit')}
                        </button>
                      ))}
                    </div>
                  )}
                  {paymentMode === 'partial' && (
                    <div className="space-y-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
                      <label className="text-[11px] font-extrabold text-amber-950 block">
                        {isSw ? 'Kiasi anacholipa SASA' : 'Amount paying NOW'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#605E5C]">TSh</span>
                        <input
                          ref={partialAmountRef}
                          type="text"
                          inputMode="decimal"
                          value={amountPaidInput}
                          onChange={e => setPartialAmount(e.target.value)}
                          placeholder="0"
                          className="w-full pl-12 pr-3 py-3.5 text-xl font-extrabold bg-white border-2 border-amber-400 rounded-xl outline-none text-right text-[#0078D4] tabular-nums"
                        />
                      </div>
                      {balanceRemaining > 0 && Number(amountPaidInput) > 0 && Number(amountPaidInput) < total && (
                        <div className="text-[11px] font-bold text-rose-700 flex justify-between">
                          <span>{isSw ? 'Deni litakalobaki' : 'Balance left'}</span>
                          <span className="tabular-nums">{formatTSh(balanceRemaining)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {paymentMode !== 'credit' && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: 'cash', label: isSw ? 'Taslimu' : 'Cash' },
                        { key: 'mpesa', label: 'M-Pesa' },
                        { key: 'airtel', label: 'Airtel' },
                        { key: 'card', label: isSw ? 'Kadi' : 'Card' },
                      ].map(m => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(m.key as PaymentMethod)}
                          className={`py-2.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                            selectedPaymentMethod === m.key ? 'bg-[#0078D4] text-white border-[#0078D4]' : 'bg-white border-[#EDEBE9] text-[#605E5C]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {canIssueTraFiscal && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-[#323130]">{isSw ? 'Aina ya Risiti' : 'Receipt Type'}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setReceiptType('tra_fiscal'); setApplyVatThisSale(true); }}
                          className={`py-2.5 rounded-xl text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 ${
                            receiptType === 'tra_fiscal' ? 'bg-[#107C10] text-white' : 'bg-[#F3F2F1] text-[#605E5C]'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> TRA Fiscal
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptType('standard')}
                          className={`py-2.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                            receiptType === 'standard' ? 'bg-[#323130] text-white' : 'bg-[#F3F2F1] text-[#605E5C]'
                          }`}
                        >
                          Standard
                        </button>
                      </div>
                    </div>
                  )}
                  {(isCreditOrPartial || needsDueDate) && (
                    <select
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                      className={`w-full px-3 py-2.5 text-xs rounded-xl ${isCustomerMissingForCredit ? 'border-2 border-rose-400 bg-rose-50' : 'bg-[#F3F2F1] border border-[#EDEBE9]'}`}
                    >
                      <option value="">{isSw ? 'Chagua mteja *' : 'Select customer *'}</option>
                      {branchCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  {needsDueDate && (
                    <input
                      type="date"
                      min={todayIsoDate()}
                      value={paymentDueDate}
                      onChange={e => setPaymentDueDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#EDEBE9]"
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={handleSaveAndNext} className="py-3.5 rounded-2xl bg-amber-500 text-white font-bold text-xs cursor-pointer">
                      {isSw ? 'Hifadhi' : 'Park'}
                    </button>
                    <button type="button" onClick={handleExecuteSale} className="py-3.5 rounded-2xl bg-[#107C10] text-white font-bold text-xs cursor-pointer">
                      {isSw ? 'Lipa sasa' : 'Take Payment'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ON-THE-FLY CUSTOMER CREATION MODAL */}
      <ModalPortal open={isNewCustomerModalOpen} onClose={() => setIsNewCustomerModalOpen(false)} zClassName="z-[10060]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E1DFDD] space-y-4 mx-auto">
            <div className="flex items-center justify-between border-b border-[#F3F2F1] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#6264A7]/10 text-[#6264A7]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#323130]">
                    {isSw ? 'Sajili Mteja Mpya Papo Hapo' : 'Register Customer at POS'}
                  </h3>
                  <p className="text-[11px] text-[#605E5C]">
                    {isSw ? 'Akaunti itaundwa na kuchaguliwa kiotomatiki kwa ajili ya mauzo haya' : 'Account will be created and auto-selected for this sale'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsNewCustomerModalOpen(false)} className="text-[#605E5C] hover:text-[#323130] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#323130] mb-1">
                  {isSw ? 'Jina Kamili la Mteja *' : 'Full Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dkt. Emanuel Msuya"
                  value={newCustomerForm.name}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F3F2F1] border border-[#EDEBE9] rounded-xl focus:bg-white focus:border-[#0078D4] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#323130] mb-1">
                    {isSw ? 'Namba ya Simu *' : 'Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+255 7..."
                    value={newCustomerForm.phone}
                    onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F3F2F1] border border-[#EDEBE9] rounded-xl focus:bg-white focus:border-[#0078D4] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#323130] mb-1">
                    {isSw ? 'Kikomo cha Mkopo (TSh)' : 'Credit Limit (TSh)'}
                  </label>
                  <input
                    type="number"
                    value={newCustomerForm.creditLimit}
                    onChange={e => setNewCustomerForm({ ...newCustomerForm, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F3F2F1] border border-[#EDEBE9] rounded-xl focus:bg-white focus:border-[#0078D4] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#323130] mb-1">
                  {isSw ? 'Eneo / Anwani' : 'Location / Address'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sinza Kijiweni, Dar es Salaam"
                  value={newCustomerForm.address}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F3F2F1] border border-[#EDEBE9] rounded-xl focus:bg-white focus:border-[#0078D4] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingCustomer}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#6264A7] to-[#0078D4] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isCreatingCustomer ? (isSw ? 'Inahifadhi...' : 'Saving...') : (isSw ? 'Hifadhi & Chagua Mteja' : 'Save & Select for Sale')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#F3F2F1] text-[#323130] font-semibold text-xs cursor-pointer"
                >
                  {isSw ? 'Ghairi' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
      </ModalPortal>

      {/* COMPLETED SALE RECEIPT — portal above product grid */}
      <ModalPortal
        open={!!lastCompletedSale}
        onClose={() => { setLastCompletedSale(null); setLastTraReceipt(null); }}
        zClassName="z-[10070]"
      >
        {lastCompletedSale && (
        <div className={`bg-white rounded-2xl p-4 sm:p-5 border-2 shadow-2xl w-full mx-auto relative z-10 mt-[4vh] sm:mt-[6vh] ${
          lastTraReceipt ? 'border-[#107C10] max-w-3xl' : 'border-[#107C10] max-w-md space-y-4 text-xs'
        }`}>
          <div className="flex items-center justify-between border-b border-[#F3F2F1] pb-3 mb-3">
            <div className="flex items-center gap-2 text-[#107C10] font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {lastTraReceipt
                  ? (isSw ? 'Malipo yamefanikiwa · Risiti ya TRA' : 'Payment Successful · TRA Receipt')
                  : (isSw ? 'Malipo yamefanikiwa · Risiti ya kawaida' : 'Payment Successful · Standard Receipt')}
              </span>
            </div>
            <button type="button" onClick={() => { setLastCompletedSale(null); setLastTraReceipt(null); }} className="text-[#605E5C] cursor-pointer p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {lastTraReceipt ? (
            <div className="grid lg:grid-cols-[220px_1fr] gap-4 items-start">
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">{isSw ? 'Jumla' : 'Amount'}</div>
                  <div className="text-lg font-extrabold text-emerald-900 tabular-nums">{formatTSh(lastCompletedSale.total)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    printTraFiscalSlip(
                      lastTraReceipt,
                      taxSettings,
                      buildTraSlipMeta(efdSettings, taxSettings, {
                        userPhone: currentUser?.phone,
                        datetimeIso: lastCompletedSale.date,
                      }),
                      isSw,
                    );
                  }}
                  className="w-full py-2.5 rounded-xl bg-white border border-[#E1DFDD] text-[#323130] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#F3F2F1]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isSw ? 'Chapisha Risiti Kamili' : 'Print Full Receipt'}
                </button>
                <button
                  type="button"
                  onClick={() => { setLastCompletedSale(null); setLastTraReceipt(null); }}
                  className="w-full py-2.5 rounded-xl bg-[#6264A7] text-white font-bold text-xs cursor-pointer"
                >
                  {isSw ? 'Oda Mpya' : 'New Order'}
                </button>
              </div>
              <div className="rounded-xl border border-[#E1DFDD] bg-[#FAF9F8] p-3 max-h-[70vh] overflow-y-auto">
                <TraFiscalSlipPreview
                  receipt={lastTraReceipt}
                  tax={taxSettings}
                  meta={buildTraSlipMeta(efdSettings, taxSettings, {
                    userPhone: currentUser?.phone,
                    datetimeIso: lastCompletedSale.date,
                  })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="text-center font-mono text-[#323130] space-y-1">
                <div className="font-extrabold text-sm">{taxSettings.receiptBusinessName || (isSw ? workplace.label_sw : workplace.label_en)}</div>
                {(taxSettings.tinNumber || taxSettings.vrnNumber) && (
                  <div>
                    {taxSettings.tinNumber ? `TIN: ${taxSettings.tinNumber}` : ''}
                    {taxSettings.tinNumber && taxSettings.vrnNumber ? ' • ' : ''}
                    {taxSettings.vrnNumber ? `VRN: ${taxSettings.vrnNumber}` : ''}
                  </div>
                )}
                <div>RECEIPT NO: {lastCompletedSale.receiptNumber}</div>
                <div>CUSTOMER: {lastCompletedSale.customerName || 'Walk-in'}</div>
                <div>DATE: {lastCompletedSale.date}</div>
              </div>

              <div className="border-t border-b border-dashed border-[#C8C6C4] py-2 space-y-1 max-h-40 overflow-y-auto">
                {lastCompletedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="min-w-0">
                      {it.productName} (x{it.quantity})
                      {(it.discountPercent ?? 0) > 0 && taxSettings.discountEnabled && (
                        <span className="text-amber-700"> · -{it.discountPercent}%</span>
                      )}
                    </span>
                    <span className="font-mono shrink-0">{formatTSh(it.total)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 font-mono">
                {taxSettings.discountEnabled &&
                  taxSettings.showDiscountOnReceipts &&
                  computeSaleDiscountAmount(lastCompletedSale) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>{isSw ? 'JUMLA KABLA YA PUNGUZO:' : 'GROSS SUBTOTAL:'}</span>
                        <span>{formatTSh(saleGrossSubtotal(lastCompletedSale))}</span>
                      </div>
                      <div className="flex justify-between text-amber-700 font-bold">
                        <span>{isSw ? 'PUNGUZO:' : 'DISCOUNT:'}</span>
                        <span>- {formatTSh(computeSaleDiscountAmount(lastCompletedSale))}</span>
                      </div>
                    </>
                  )}
                <div className="flex justify-between">
                  <span>SUBTOTAL (EXCL VAT):</span>
                  <span>{formatTSh(lastCompletedSale.subtotal)}</span>
                </div>
                {vatActive && taxSettings.showVatOnReceipt && (
                  <div className="flex justify-between">
                    <span>{formatVatLabel(taxSettings, isSw).toUpperCase()}:</span>
                    <span>{formatTSh(lastCompletedSale.vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#323130] pt-1 border-t border-[#EDEBE9]">
                  <span>TOTAL INCL VAT:</span>
                  <span>{formatTSh(lastCompletedSale.total)}</span>
                </div>
                <div className="flex justify-between text-[#107C10] font-bold">
                  <span>PAID ({lastCompletedSale.payments[0]?.method.toUpperCase()}):</span>
                  <span>{formatTSh(lastCompletedSale.paidAmount)}</span>
                </div>
                {lastCompletedSale.balanceRemaining > 0 && (
                  <>
                    <div className="flex justify-between text-[#D13438] font-bold">
                      <span>POSTED TO CREDIT BALANCE:</span>
                      <span>{formatTSh(lastCompletedSale.balanceRemaining)}</span>
                    </div>
                    {lastCompletedSale.paymentDueDate && (
                      <div className="flex justify-between text-[#E65100] font-bold">
                        <span>{isSw ? 'TAREHE YA MALIPO:' : 'PAYMENT DUE:'}</span>
                        <span>{formatDueDateDisplay(lastCompletedSale.paymentDueDate)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {taxSettings.receiptFooterNote && (
                <div className="text-center text-[10px] text-[#605E5C]">{taxSettings.receiptFooterNote}</div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!lastCompletedSale) return;
                    const tpl = getActive('invoice');
                    const data = saleReceiptRenderData(lastCompletedSale, isSw, {
                      showDiscount: taxSettings.showDiscountOnDocuments && taxSettings.discountEnabled,
                    });
                    printDocument(tpl, data, config.branding, isSw);
                    setLastCompletedSale(null);
                    setLastTraReceipt(null);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-[#0078D4] hover:bg-[#006cbd] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isSw ? 'Chapisha Risiti' : 'Print Receipt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLastCompletedSale(null); setLastTraReceipt(null); }}
                  className="px-4 py-2.5 rounded-lg bg-[#F3F2F1] text-[#323130] font-semibold text-xs cursor-pointer"
                >
                  {isSw ? 'Funga' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </ModalPortal>

      {/* POS QR Scanner Modal */}
      <POSQRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onProductScanned={handleAddToCart}
        language={language}
      />
    </div>
  );
};
