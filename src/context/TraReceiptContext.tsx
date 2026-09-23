import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SaleTransaction } from '@/types/v1';
import type { EfdApiSettings, TraReceipt } from '@/types/traReceipt';
import { loadTraReceipts, saveTraReceipts, addTraReceipt } from '@/lib/traReceiptStore';
import { loadEfdApiSettings, saveEfdApiSettings } from '@/lib/efdSettingsStore';
import { issueTraReceipt, testEfdConnection } from '@/lib/efdApi';
import { useTaxCompliance } from '@/context/TaxComplianceContext';
import type { TraCustomerIdType } from '@/types/traReceipt';
import { api } from '@/lib/api';
import { mapApiTraConfigToSettings, settingsToTraConfigApi } from '@/lib/traEfdConfigMap';
import {
  mapFiscalRecordToTraReceipt,
  mergeTraReceiptLists,
} from '@/lib/traReceiptApiMap';

interface IssueFromSaleOptions {
  customerMobile?: string;
  customerIdType?: TraCustomerIdType;
  customerIdNumber?: string;
}

interface TraReceiptContextValue {
  receipts: TraReceipt[];
  efdSettings: EfdApiSettings;
  configLoading: boolean;
  updateEfdSettings: (patch: Partial<EfdApiSettings>) => void;
  saveEfdSettings: (next: EfdApiSettings) => Promise<void>;
  testConnection: () => Promise<{ ok: boolean; message: string }>;
  issueFromSale: (sale: SaleTransaction, companyName: string, opts?: IssueFromSaleOptions) => Promise<TraReceipt | null>;
  refreshReceipts: () => Promise<void>;
  receiptsLoading: boolean;
  selectedReceiptId: string | null;
  setSelectedReceiptId: (id: string | null) => void;
}

const TraReceiptContext = createContext<TraReceiptContextValue | null>(null);

interface TraReceiptProviderProps {
  tenantId?: string | null;
  children: React.ReactNode;
}

export const TraReceiptProvider: React.FC<TraReceiptProviderProps> = ({ tenantId, children }) => {
  const { settings: taxSettings } = useTaxCompliance();
  const [receipts, setReceipts] = useState<TraReceipt[]>(() => loadTraReceipts(tenantId));
  const [efdSettings, setEfdSettings] = useState<EfdApiSettings>(() => loadEfdApiSettings(tenantId));
  const [configLoading, setConfigLoading] = useState(false);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  useEffect(() => {
    setReceipts(loadTraReceipts(tenantId));
    setEfdSettings(loadEfdApiSettings(tenantId));
    setSelectedReceiptId(null);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId || !api.hasValidSession()) return;
    setConfigLoading(true);
    api
      .getTraEfdConfig()
      .then(raw => {
        const mapped = mapApiTraConfigToSettings(raw);
        setEfdSettings(mapped);
        saveEfdApiSettings(tenantId, mapped);
      })
      .catch(() => undefined)
      .finally(() => setConfigLoading(false));
  }, [tenantId]);

  const refreshReceipts = useCallback(async () => {
    const local = loadTraReceipts(tenantId);
    if (!tenantId || !api.hasValidSession()) {
      setReceipts(local);
      return;
    }
    setReceiptsLoading(true);
    try {
      const rows = await api.listTraFiscalReceipts(200);
      const fromApi = rows.map(r => mapFiscalRecordToTraReceipt(r));
      const merged = mergeTraReceiptLists(local, fromApi);
      saveTraReceipts(tenantId, merged);
      setReceipts(merged);
    } catch {
      setReceipts(local);
    } finally {
      setReceiptsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refreshReceipts();
  }, [refreshReceipts]);

  const updateEfdSettings = useCallback(
    (patch: Partial<EfdApiSettings>) => {
      setEfdSettings(prev => {
        const next = { ...prev, ...patch };
        saveEfdApiSettings(tenantId, next);
        return next;
      });
    },
    [tenantId],
  );

  const saveEfdSettingsFn = useCallback(
    async (next: EfdApiSettings) => {
      const includeSecret = Boolean(next.clientSecret.trim());
      if (tenantId && api.hasValidSession()) {
        const saved = await api.updateTraEfdConfig(settingsToTraConfigApi(next, includeSecret));
        const mapped = mapApiTraConfigToSettings(saved);
        if (includeSecret) mapped.clientSecret = '';
        saveEfdApiSettings(tenantId, mapped);
        setEfdSettings(mapped);
        return;
      }
      saveEfdApiSettings(tenantId, next);
      setEfdSettings(next);
    },
    [tenantId],
  );

  const testConnection = useCallback(async () => {
    if (tenantId && api.hasValidSession()) {
      await api.updateTraEfdConfig(settingsToTraConfigApi(efdSettings, true));
    }
    const result = await testEfdConnection(efdSettings);
    let next = {
      ...efdSettings,
      lastTestAt: new Date().toISOString(),
      lastTestOk: result.ok,
      lastTestMessage: result.message,
    };
    if (tenantId && api.hasValidSession() && result.ok) {
      try {
        const raw = await api.getTraEfdConfig();
        next = { ...mapApiTraConfigToSettings(raw), ...next, clientSecret: '' };
      } catch {
        /* keep local test flags */
      }
    }
    saveEfdApiSettings(tenantId, next);
    setEfdSettings(next);
    return result;
  }, [efdSettings, tenantId]);

  const issueFromSale = useCallback(
    async (sale: SaleTransaction, companyName: string, opts?: IssueFromSaleOptions) => {
      if (taxSettings.mode !== 'tra_efd') return null;
      const receipt = await issueTraReceipt({
        sale,
        taxSettings,
        efdSettings,
        companyName,
        customerMobile: opts?.customerMobile,
        customerIdType: opts?.customerIdType,
        customerIdNumber: opts?.customerIdNumber,
        branchId: sale.branchId,
      });
      const list = addTraReceipt(tenantId, receipt);
      setReceipts(list);
      return receipt;
    },
    [taxSettings, efdSettings, tenantId],
  );

  const value = useMemo(
    () => ({
      receipts,
      efdSettings,
      configLoading,
      updateEfdSettings,
      saveEfdSettings: saveEfdSettingsFn,
      testConnection,
      issueFromSale,
      refreshReceipts,
      receiptsLoading,
      selectedReceiptId,
      setSelectedReceiptId,
    }),
    [
      receipts,
      efdSettings,
      configLoading,
      receiptsLoading,
      updateEfdSettings,
      saveEfdSettingsFn,
      testConnection,
      issueFromSale,
      refreshReceipts,
      selectedReceiptId,
    ],
  );

  return <TraReceiptContext.Provider value={value}>{children}</TraReceiptContext.Provider>;
};

export function useTraReceipts(): TraReceiptContextValue {
  const ctx = useContext(TraReceiptContext);
  if (!ctx) throw new Error('useTraReceipts must be used within TraReceiptProvider');
  return ctx;
}
