import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  DEFAULT_BILLING_SETTINGS,
  mapBillingSettings,
  type PlatformBillingSettings,
} from '@/lib/billingContact';

interface PlatformBillingContextValue {
  settings: PlatformBillingSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<PlatformBillingSettings>) => Promise<void>;
}

const PlatformBillingContext = createContext<PlatformBillingContextValue | null>(null);

export function PlatformBillingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformBillingSettings>(DEFAULT_BILLING_SETTINGS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await api.getPublicBillingSettings();
      setSettings(mapBillingSettings(raw as Record<string, unknown>));
    } catch {
      setSettings(DEFAULT_BILLING_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateSettings = useCallback(async (patch: Partial<PlatformBillingSettings>) => {
    const body: Record<string, unknown> = {};
    if (patch.trialDays != null) body.trial_days = patch.trialDays;
    if (patch.graceDays != null) body.grace_days = patch.graceDays;
    if (patch.lipaNumber != null) body.lipa_number = patch.lipaNumber;
    if (patch.lipaName != null) body.lipa_name = patch.lipaName;
    if (patch.whatsappNumber != null) body.whatsapp_number = patch.whatsappNumber;
    if (patch.supportNoteEn != null) body.support_note_en = patch.supportNoteEn;
    if (patch.supportNoteSw != null) body.support_note_sw = patch.supportNoteSw;
    const raw = await api.updateAdminBillingSettings(body);
    setSettings(mapBillingSettings(raw as Record<string, unknown>));
  }, []);

  const value = useMemo(
    () => ({ settings, loading, refresh, updateSettings }),
    [settings, loading, refresh, updateSettings],
  );

  return (
    <PlatformBillingContext.Provider value={value}>{children}</PlatformBillingContext.Provider>
  );
}

export function usePlatformBilling(): PlatformBillingContextValue {
  const ctx = useContext(PlatformBillingContext);
  if (!ctx) {
    return {
      settings: DEFAULT_BILLING_SETTINGS,
      loading: false,
      refresh: async () => {},
      updateSettings: async () => {},
    };
  }
  return ctx;
}
