import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Scale,
  FileSpreadsheet,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { Customer, ExpenseItem, Language, Product, PurchaseOrder, SaleTransaction } from '@/types/v1';
import { api } from '@/lib/api';
import { formatTSh } from '@/utils/translations';
import { useTaxCompliance } from '@/context/TaxComplianceContext';
import { isVatActive } from '@/lib/taxComplianceSettings';
import type { AccountingBooksMode } from '@/lib/accountingDerivedReports';
import type { AccountingReportBundle } from '@/lib/accountingApiTypes';
import { loadAccountingReports, type AccountingDataSource } from '@/lib/accountingReportLoader';
import { AccountingOdooDashboard } from '@/components/v1/accounting/AccountingOdooDashboard';
import {
  AccountingReportingPanel,
  type AccountingReportId,
} from '@/components/v1/accounting/AccountingReportingPanel';

type MainMode = 'dashboard' | 'reporting' | 'operations';
type OpsTab = 'accounts' | 'journal' | 'trial';

interface AccountingHubViewProps {
  language: Language;
  businessName?: string;
  branchName?: string;
  branchId?: string | null;
  sales?: SaleTransaction[];
  products?: Product[];
  customers?: Customer[];
  expenses?: ExpenseItem[];
  purchaseOrders?: PurchaseOrder[];
  onNavigateToPayroll?: () => void;
}

interface AccountRow {
  id: string;
  code: string;
  name: string;
  account_type: string;
}

interface TrialRow {
  code: string;
  name: string;
  debit: number;
  credit: number;
}

export const AccountingHubView: React.FC<AccountingHubViewProps> = ({
  language,
  businessName = 'Duka+',
  branchName,
  branchId = null,
  sales = [],
  products = [],
  customers = [],
  expenses = [],
  purchaseOrders = [],
  onNavigateToPayroll,
}) => {
  const isSw = language === 'sw';
  const { settings: taxSettings } = useTaxCompliance();
  const vatRegistered = isVatActive(taxSettings);

  const [mainMode, setMainMode] = useState<MainMode>('dashboard');
  const [opsTab, setOpsTab] = useState<OpsTab>('accounts');
  const [reportFocus, setReportFocus] = useState<AccountingReportId>('income');
  const [booksMode, setBooksMode] = useState<AccountingBooksMode>(vatRegistered ? 'tra' : 'standard');

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [trialRows, setTrialRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [journalForm, setJournalForm] = useState({
    reference: '',
    memo: '',
    debitCode: '1000',
    creditCode: '4000',
    amount: '',
  });
  const [reportBundle, setReportBundle] = useState<AccountingReportBundle | null>(null);
  const [journalEntries, setJournalEntries] = useState<Array<Record<string, unknown>>>([]);
  const [dataSource, setDataSource] = useState<AccountingDataSource | 'local'>('local');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (vatRegistered) setBooksMode('tra');
  }, [vatRegistered]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await api.getLedgerAccounts();
      setAccounts(
        rows.map(r => ({
          id: String(r.id),
          code: String(r.code),
          name: String(r.name),
          account_type: String(r.account_type),
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getTrialBalance();
      setTrialRows(
        (res.rows || []).map(r => ({
          code: String(r.code),
          name: String(r.name),
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReportBundle = useCallback(async () => {
    if (!api.hasValidSession()) return;
    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const result = await loadAccountingReports(booksMode, branchId);
      setReportBundle(result.bundle);
      setDataSource(result.source);
      setTrialRows(
        (result.bundle.trial_balance?.rows || []).map(r => ({
          code: r.code,
          name: r.name,
          debit: r.debit,
          credit: r.credit,
        })),
      );
      if (result.source === 'operational-api') {
        setInfoMessage(
          isSw
            ? 'Data hai kutoka API (mauzo, wateja, stoo, matumizi, na mizani ya majaribio). Endelea kusasisha backend kwenye Railway kwa bundle kamili.'
            : 'Live data from API (sales, customers, stock, expenses, trial balance). Deploy the latest backend to Railway for the full report bundle endpoint.',
        );
      }
    } catch (e) {
      setReportBundle(null);
      setDataSource('local');
      try {
        await loadTrial();
        setError(e instanceof Error ? e.message : 'Could not load accounting reports from API');
      } catch {
        setError(
          isSw
            ? 'Imeshindwa kupakia ripoti — hakikisha umeingia na backend inafanya kazi.'
            : 'Could not load reports — check login and backend connectivity.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [booksMode, branchId, loadTrial, isSw]);

  const loadJournalEntries = useCallback(async () => {
    try {
      const rows = await api.getJournalEntries(60);
      setJournalEntries(rows as Array<Record<string, unknown>>);
    } catch {
      setJournalEntries([]);
    }
  }, []);

  useEffect(() => {
    if (!api.hasValidSession()) return;
    void loadAccounts();
    void loadReportBundle();
    void loadJournalEntries();
  }, [loadAccounts, loadReportBundle, loadJournalEntries, booksMode, branchId]);

  const postJournal = async () => {
    const amount = Number(journalForm.amount);
    if (!amount || amount <= 0) return;
    setLoading(true);
    setError('');
    try {
      await api.createJournalEntry({
        entry_date: new Date().toISOString().slice(0, 10),
        reference: journalForm.reference || `JE-${Date.now()}`,
        memo: journalForm.memo,
        lines: [
          { account_code: journalForm.debitCode, label: journalForm.memo || 'Debit', debit: amount, credit: 0 },
          { account_code: journalForm.creditCode, label: journalForm.memo || 'Credit', debit: 0, credit: amount },
        ],
      });
      setJournalForm(f => ({ ...f, amount: '', memo: '', reference: '' }));
      await loadReportBundle();
      await loadJournalEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post entry');
    } finally {
      setLoading(false);
    }
  };

  const openReporting = (focus?: string) => {
    if (focus) setReportFocus(focus as AccountingReportId);
    setMainMode('reporting');
  };

  const openOperations = (tab: OpsTab) => {
    setOpsTab(tab);
    setMainMode('operations');
    if (tab === 'trial') void loadReportBundle();
    if (tab === 'journal') void loadJournalEntries();
  };

  const mainTabs: { id: MainMode; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: isSw ? 'Muhtasari' : 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'reporting', label: isSw ? 'Ripoti' : 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'operations', label: isSw ? 'Vitabu (juu)' : 'Advanced', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const opsTabs: { id: OpsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'accounts', label: isSw ? 'Chati ya akaunti' : 'Chart of accounts', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'journal', label: isSw ? 'Ingizo jipya' : 'New entry', icon: <Plus className="w-4 h-4" /> },
    { id: 'trial', label: isSw ? 'Mizani ya majaribio' : 'Trial balance', icon: <Scale className="w-4 h-4" /> },
  ];

  const trialForReports = useMemo(() => trialRows, [trialRows]);

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white rounded-xl border border-[#d4e8dc] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#107C10] text-xs font-bold uppercase tracking-wide">
              <FileSpreadsheet className="w-4 h-4" />
              {isSw ? 'Uhasibu' : 'Accounting'}
            </div>
            <h2 className="text-xl font-bold text-[#1a3d2e] mt-1">
              {isSw ? 'Fedha' : 'Finance'}
            </h2>
            <p className="text-sm text-[#5a7a68] mt-1 max-w-xl">
              {isSw
                ? 'Angalia muhtasari, fungua ripoti unazohitaji, au vitabu vya uhasibu — hatua moja kwa wakati.'
                : 'See a summary, open the report you need, or bookkeeping — one step at a time.'}
            </p>
            {(dataSource === 'bundle' || dataSource === 'operational-api') && (
              <p className="text-[11px] text-[#107C10] font-semibold mt-1">
                {dataSource === 'bundle'
                  ? isSw
                    ? 'Data kutoka API ya uhasibu'
                    : 'Data from accounting API'
                  : isSw
                    ? 'Data hai kutoka biashara yako'
                    : 'Live data from your shop'}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadAccounts();
                void loadReportBundle();
                void loadJournalEntries();
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#d4e8dc] text-sm font-semibold text-[#1a3d2e] bg-white cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {isSw ? 'Onyesha upya' : 'Refresh'}
            </button>
            {onNavigateToPayroll ? (
              <button
                type="button"
                onClick={onNavigateToPayroll}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#714b67]/40 bg-[#f1e9ef] text-sm font-semibold text-[#714b67] cursor-pointer"
              >
                {isSw ? 'Mishahara & PAYE' : 'Payroll & statutory'}
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="mt-4 flex flex-wrap gap-2 p-1 rounded-xl bg-[#eef5f0] border border-[#d4e8dc]"
          role="tablist"
          aria-label={isSw ? 'Sehemu za uhasibu' : 'Accounting sections'}
        >
          {mainTabs.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mainMode === t.id}
              onClick={() => setMainMode(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                mainMode === t.id
                  ? 'bg-white text-[#1a3d2e] shadow-sm ring-1 ring-[#d4e8dc]'
                  : 'text-[#5a7a68] hover:text-[#1a3d2e] hover:bg-white/60'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        {mainMode === 'reporting' && vatRegistered && (
          <p className="mt-3 text-xs text-[#5a7a68] flex flex-wrap items-center gap-2">
            {isSw ? 'Vitabu vya ripoti:' : 'Report books:'}
            <span className="inline-flex rounded-lg border border-[#d4e8dc] p-0.5 bg-[#f5faf7]">
              <button
                type="button"
                onClick={() => setBooksMode('standard')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                  booksMode === 'standard' ? 'bg-white shadow-sm text-[#1a3d2e]' : 'text-[#5a7a68]'
                }`}
              >
                {isSw ? 'Kawaida' : 'Standard'}
              </button>
              <button
                type="button"
                onClick={() => setBooksMode('tra')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                  booksMode === 'tra' ? 'bg-[#107C10] text-white' : 'text-[#5a7a68]'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                TRA
              </button>
            </span>
          </p>
        )}
      </div>

      {infoMessage && (
        <div className="text-sm text-[#1a3d2e] bg-[#e7f5ec] border border-[#b8dfc8] rounded-lg px-3 py-2">{infoMessage}</div>
      )}
      {error && (
        <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {mainMode === 'dashboard' && (
        <AccountingOdooDashboard
          language={language}
          sales={sales}
          purchaseOrders={purchaseOrders}
          booksMode={booksMode}
          onOpenReporting={openReporting}
          onOpenOperations={openOperations}
        />
      )}

      {mainMode === 'reporting' && (
        <AccountingReportingPanel
          language={language}
          businessName={businessName}
          branchName={branchName}
          sales={sales}
          products={products}
          customers={customers}
          expenses={expenses}
          purchaseOrders={purchaseOrders}
          booksMode={booksMode}
          trialRows={trialForReports}
          reportBundle={reportBundle}
          initialReport={reportFocus}
        />
      )}

      {mainMode === 'operations' && (
        <>
          <div className="flex flex-wrap gap-2">
            {opsTabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setOpsTab(t.id);
                  if (t.id === 'trial') void loadReportBundle();
                  if (t.id === 'journal') void loadJournalEntries();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
                  opsTab === t.id ? 'bg-[#1e4d36] text-white' : 'bg-white border border-[#d4e8dc] text-[#1a3d2e]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {opsTab === 'accounts' && (
            <div className="bg-white rounded-xl border border-[#d4e8dc] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-[#e7f5ec] text-xs uppercase text-[#3d5c4a]">
                    <tr>
                      <th className="text-left px-4 py-2">{isSw ? 'Nambari' : 'Code'}</th>
                      <th className="text-left px-4 py-2">{isSw ? 'Jina' : 'Name'}</th>
                      <th className="text-left px-4 py-2">{isSw ? 'Aina' : 'Type'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(a => (
                      <tr key={a.id} className="border-t border-[#eef5f0]">
                        <td className="px-4 py-2 font-mono text-xs">{a.code}</td>
                        <td className="px-4 py-2">{a.name}</td>
                        <td className="px-4 py-2 capitalize text-[#5a7a68]">{a.account_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {opsTab === 'journal' && (
            <div className="bg-white rounded-xl border border-[#d4e8dc] p-4 sm:p-5 shadow-sm space-y-4 max-w-lg">
              <p className="text-sm text-[#5a7a68]">
                {isSw
                  ? 'Ingiza shughuli sahihi (deni = mkopo). Makosa yanasahihishwa kwa kuingiza kinyume, si kwa kufuta.'
                  : 'Post a balanced entry (debits = credits). Corrections use reversing entries, not silent deletes.'}
              </p>
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#d4e8dc] text-sm"
                placeholder={isSw ? 'Rejea' : 'Reference'}
                value={journalForm.reference}
                onChange={e => setJournalForm(f => ({ ...f, reference: e.target.value }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#d4e8dc] text-sm"
                placeholder={isSw ? 'Maelezo' : 'Memo'}
                value={journalForm.memo}
                onChange={e => setJournalForm(f => ({ ...f, memo: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-[#5a7a68]">{isSw ? 'Deni' : 'Debit'}</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[#d4e8dc] text-sm"
                    value={journalForm.debitCode}
                    onChange={e => setJournalForm(f => ({ ...f, debitCode: e.target.value }))}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.code}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-[#5a7a68]">{isSw ? 'Mkopo' : 'Credit'}</label>
                  <select
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[#d4e8dc] text-sm"
                    value={journalForm.creditCode}
                    onChange={e => setJournalForm(f => ({ ...f, creditCode: e.target.value }))}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.code}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 rounded-lg border border-[#d4e8dc] text-sm font-mono"
                placeholder={isSw ? 'Kiasi (TZS)' : 'Amount (TZS)'}
                value={journalForm.amount}
                onChange={e => setJournalForm(f => ({ ...f, amount: e.target.value }))}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void postJournal()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#107C10] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
              >
                {isSw ? 'Chapisha ingizo' : 'Post entry'} · {formatTSh(Number(journalForm.amount) || 0)}
              </button>
              {journalEntries.length > 0 && (
                <div className="border-t border-[#e7f5ec] pt-4 mt-2">
                  <h4 className="text-sm font-bold text-[#1a3d2e] mb-2">
                    {isSw ? 'Ingizo za hivi karibuni' : 'Recent journal entries'}
                  </h4>
                  <ul className="space-y-2 max-h-48 overflow-y-auto text-xs">
                    {journalEntries.slice(0, 12).map(entry => (
                      <li key={String(entry.id)} className="border border-[#eef5f0] rounded-md px-2 py-1.5">
                        <span className="font-mono font-semibold">{String(entry.reference || '')}</span>
                        <span className="text-[#5a7a68] ml-2">{String(entry.entry_date || '').slice(0, 10)}</span>
                        <p className="text-[#5a7a68] truncate">{String(entry.memo || '')}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {opsTab === 'trial' && (
            <div className="bg-white rounded-xl border border-[#d4e8dc] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-[#e7f5ec] text-xs uppercase text-[#3d5c4a]">
                    <tr>
                      <th className="text-left px-4 py-2">{isSw ? 'Akaunti' : 'Account'}</th>
                      <th className="text-right px-4 py-2">{isSw ? 'Deni' : 'Debit'}</th>
                      <th className="text-right px-4 py-2">{isSw ? 'Mkopo' : 'Credit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-[#5a7a68]">
                          {isSw ? 'Hakuna shughuli bado — chapisha ingizo la kwanza.' : 'No activity yet — post your first entry.'}
                        </td>
                      </tr>
                    ) : (
                      trialRows.map(r => (
                        <tr key={r.code} className="border-t border-[#eef5f0]">
                          <td className="px-4 py-2">
                            <span className="font-mono text-xs mr-2">{r.code}</span>
                            {r.name}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-mono">{formatTSh(r.debit)}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-mono">{formatTSh(r.credit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
