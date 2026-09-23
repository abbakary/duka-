import React, { useEffect, useState } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import type { Language } from '@/types/v1';
import type { EfdApiSettings, TraEfdCustomerIdTypeCode } from '@/types/traReceipt';
import { DEFAULT_EFD_API_BASE } from '@/types/traReceipt';
import { useTraReceipts } from '@/context/TraReceiptContext';
import { TRA_CUSTOMER_ID_TYPES } from '@/lib/efdApi';

interface TraEfdApiSectionProps {
  language: Language;
  sectionId?: string;
}

export const TraEfdApiSection: React.FC<TraEfdApiSectionProps> = ({
  language,
  sectionId = 'tra-efd-api',
}) => {
  const isSw = language === 'sw';
  const { efdSettings, saveEfdSettings, testConnection, configLoading } = useTraReceipts();
  const [draftEfd, setDraftEfd] = useState<EfdApiSettings>(efdSettings);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraftEfd(efdSettings);
  }, [efdSettings]);

  const handleSave = () => {
    void saveEfdSettings(draftEfd).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setDraftEfd(d => ({ ...d, clientSecret: '' }));
    });
  };

  const handleTest = async () => {
    setTesting(true);
    await saveEfdSettings(draftEfd);
    await testConnection();
    setTesting(false);
    setDraftEfd(d => ({ ...d, clientSecret: '' }));
  };

  const idTypeOptions: { value: TraEfdCustomerIdTypeCode; label: string }[] = [
    { value: '1', label: 'TIN' },
    { value: '5', label: 'NIDA' },
    { value: '4', label: isSw ? 'Pasipoti' : 'Passport' },
    { value: '2', label: isSw ? 'Leseni ya udereva' : 'Driving license' },
    { value: '6', label: isSw ? 'Simu (mteja wa kawaida)' : 'Telephone (walk-in)' },
  ];

  return (
    <div id={sectionId} className="space-y-4 scroll-mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E1DFDD] p-5 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#323130] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#E65100]" />
            {isSw ? 'Muunganisho wa EFD API' : 'EFD API Connection'}
          </h3>
          <p className="text-xs text-[#605E5C]">
            {isSw
              ? 'Weka Client ID na Secret kutoka mtoa huduma wa VEFD. Siri hazionyeshwi kwenye kivinjari — zinahifadhiwa kwenye seva.'
              : 'Enter the VEFD Client ID and Secret from your provider. Secrets stay on the server — never in the browser.'}
          </p>
          {configLoading && (
            <p className="text-xs text-[#605E5C] animate-pulse">
              {isSw ? 'Inapakia usanidi…' : 'Loading configuration…'}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draftEfd.enabled}
              onChange={e => setDraftEfd(d => ({ ...d, enabled: e.target.checked }))}
            />
            {isSw ? 'Washa muunganisho wa EFD API' : 'Enable EFD API integration'}
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draftEfd.demoMode}
              onChange={e => setDraftEfd(d => ({ ...d, demoMode: e.target.checked }))}
            />
            {isSw ? 'Hali ya majaribio (Demo / Sandbox)' : 'Demo / sandbox mode'}
          </label>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-[#605E5C]">API Base URL</label>
              <input
                type="text"
                value={draftEfd.apiBaseUrl}
                onChange={e => setDraftEfd(d => ({ ...d, apiBaseUrl: e.target.value }))}
                placeholder={DEFAULT_EFD_API_BASE}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E1DFDD] text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[#605E5C]">Client ID</label>
              <input
                type="text"
                value={draftEfd.clientId}
                onChange={e => setDraftEfd(d => ({ ...d, clientId: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E1DFDD] text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[#605E5C]">
                Client Secret {efdSettings.hasClientSecret ? (isSw ? '(imehifadhiwa)' : '(stored)') : ''}
              </label>
              <input
                type="password"
                value={draftEfd.clientSecret}
                onChange={e => setDraftEfd(d => ({ ...d, clientSecret: e.target.value }))}
                placeholder={efdSettings.hasClientSecret ? (isSw ? 'Acha tupu kubaki' : 'Leave blank to keep') : ''}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E1DFDD] text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#605E5C]">
                  {isSw ? 'Jiji / eneo' : 'City / location'}
                </label>
                <input
                  type="text"
                  value={draftEfd.companyCity}
                  onChange={e => setDraftEfd(d => ({ ...d, companyCity: e.target.value }))}
                  placeholder="DAR ES SALAAM"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E1DFDD] text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#605E5C]">
                  {isSw ? 'Simu ya duka' : 'Shop mobile'}
                </label>
                <input
                  type="text"
                  value={draftEfd.companyMobile}
                  onChange={e => setDraftEfd(d => ({ ...d, companyMobile: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E1DFDD] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[#605E5C]">
                {isSw ? 'Aina ya kitambulisho chaguo-msingi' : 'Default customer ID type'}
              </label>
              <select
                value={draftEfd.defaultCustomerIdType}
                onChange={e =>
                  setDraftEfd(d => ({
                    ...d,
                    defaultCustomerIdType: e.target.value as TraEfdCustomerIdTypeCode,
                  }))
                }
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E1DFDD] text-sm"
              >
                {idTypeOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(efdSettings.companyVrn || efdSettings.companySerial) && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">{isSw ? 'Wasifu wa kifaa (kutoka TRA)' : 'Device profile (from TRA)'}</p>
              {efdSettings.companyVrn && <p>VRN: {efdSettings.companyVrn}</p>}
              {efdSettings.companyTin && <p>TIN: {efdSettings.companyTin}</p>}
              {efdSettings.companySerial && <p>{isSw ? 'Serial' : 'Serial'}: {efdSettings.companySerial}</p>}
              {efdSettings.taxOffice && <p>{isSw ? 'Ofisi ya kodi' : 'Tax office'}: {efdSettings.taxOffice}</p>}
              {efdSettings.connectionStatus === 'connected' && (
                <p className="text-[10px] opacity-80">
                  {efdSettings.tokenUserName || '—'} · {efdSettings.tokenEmail || '—'}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E65100] text-white text-sm font-bold"
            >
              <Save className="w-4 h-4" />
              {saved ? (isSw ? 'Imehifadhiwa!' : 'Saved!') : isSw ? 'Hifadhi API' : 'Save API'}
            </button>
            <button
              type="button"
              disabled={testing || !draftEfd.clientId.trim()}
              onClick={() => void handleTest()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E1DFDD] text-sm font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              {isSw ? 'Jaribu Muunganisho' : 'Test Connection'}
            </button>
          </div>

          {efdSettings.lastTestAt && (
            <div
              className={`text-xs rounded-lg p-3 border ${
                efdSettings.lastTestOk
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <strong>{isSw ? 'Jaribio la mwisho:' : 'Last test:'}</strong>{' '}
              {new Date(efdSettings.lastTestAt).toLocaleString()}
              <br />
              {efdSettings.lastTestMessage}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E1DFDD] p-5 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#323130]">
            {isSw ? 'Maelezo ya Mteja (POS)' : 'Customer Fields at POS'}
          </h3>
          <p className="text-xs text-[#605E5C]">
            {isSw
              ? 'Aina ya kitambulisho, nambari, na simu zinachukuliwa kutoka mteja aliyechaguliwa kwenye POS.'
              : 'ID type, ID number, and mobile are captured from the customer selected at POS checkout.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TRA_CUSTOMER_ID_TYPES.map(t => (
              <span key={t} className="px-2 py-0.5 rounded bg-[#F3F2F1] text-[10px] font-semibold">
                {t}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[#605E5C] border-t border-[#EDEBE9] pt-3">
            {isSw
              ? 'Hakikisha TIN, VRN, na serial ya EFD zimewekwa kwenye sehemu ya Kodi hapo juu kabla ya kuwasilisha risiti.'
              : 'Ensure TIN, VRN, and EFD serial are set in the Tax section above before submitting receipts.'}
          </p>
        </div>
      </div>
    </div>
  );
};
