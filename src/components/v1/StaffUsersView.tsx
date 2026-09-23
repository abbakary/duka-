import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserCog,
  Banknote,
  HandCoins,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  ArrowRight,
  Plus,
  LayoutDashboard,
  UserPlus,
  CalendarOff,
  Star,
  BarChart3,
} from 'lucide-react';
import { HrOdooDashboard } from '@/components/v1/hr/HrOdooDashboard';
import { PayrollTanzaniaHub } from '@/components/v1/payroll/PayrollTanzaniaHub';
import { HrRecruitmentKanban } from '@/components/v1/hr/HrRecruitmentKanban';
import { HrTimeOffPanel } from '@/components/v1/hr/HrTimeOffPanel';
import { HrAppraisalsPanel } from '@/components/v1/hr/HrAppraisalsPanel';
import { HrReportingPanel } from '@/components/v1/hr/HrReportingPanel';
import { HrEmployeeDirectoryCards } from '@/components/v1/hr/HrEmployeeDirectoryCards';
import { loadHrStore, saveHrStore, type HrStoreSnapshot } from '@/lib/hrStore';
import { api } from '@/lib/api';
import type { HrDepartmentId } from '@/lib/hrDerivedMetrics';
import { StaffTeamPanel } from '@/components/v1/StaffTeamPanel';
import { ToastPortal } from '@/components/ui/ModalPortal';
import { computeCashierLeaderboard } from '@/lib/analyticsCompute';
import { getOpenCashierShift } from '@/lib/cashierShiftStore';
import {
  currentMonthStr,
  findTodayAllowanceClaim,
  loadPayrollStore,
  savePayrollStore,
  todayDateStr,
  type StaffPayrollConfig,
} from '@/lib/payrollStore';
import { fetchPayrollContractsMerged, pushPayrollContractToApi } from '@/lib/payrollApiSync';
import {
  canManageHrPeople,
  canManagePayroll,
  canManageStaffRBAC,
  canPostPayrollAccounting,
  canSwitchStaffWorkstation,
  getDashboardPersona,
} from '@/lib/rbac';
import { formatTSh } from '@/utils/translations';
import type {
  AuthUser,
  Language,
  SaleTransaction,
  StaffMember,
} from '@/types/v1';

type PeopleTab =
  | 'dashboard'
  | 'overview'
  | 'directory'
  | 'recruitment'
  | 'timeoff'
  | 'appraisals'
  | 'reporting'
  | 'compensation'
  | 'attendance'
  | 'payroll';

interface StaffUsersViewProps {
  language: Language;
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  currentUser?: AuthUser | null;
  sales?: SaleTransaction[];
  tenantStorageId?: string;
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  onNavigate?: (tab: string) => void;
  onNavigateToAccounting?: () => void;
  onSwitchToStaffSite?: (staff: StaffMember) => void;
  initialSection?: PeopleTab;
}

export const StaffUsersView: React.FC<StaffUsersViewProps> = ({
  language,
  staffList,
  setStaffList,
  currentUser,
  sales = [],
  tenantStorageId,
  activeBranchId,
  activeBranchName,
  onNavigate,
  onNavigateToAccounting,
  onSwitchToStaffSite,
  initialSection,
}) => {
  const isSw = language === 'sw';
  const canTeam = canManageHrPeople(currentUser);
  const canPay = canManagePayroll(currentUser) || canPostPayrollAccounting(currentUser);
  const persona = getDashboardPersona(currentUser);
  const canSwitch = canSwitchStaffWorkstation(currentUser) && Boolean(onSwitchToStaffSite);
  const tenantId = tenantStorageId || currentUser?.businessId || currentUser?.id || 'local';
  const today = todayDateStr();
  const month = currentMonthStr();

  const [tab, setTab] = useState<PeopleTab>(() => initialSection ?? (canManageStaffRBAC(currentUser) ? 'dashboard' : 'dashboard'));

  useEffect(() => {
    if (initialSection) setTab(initialSection);
  }, [initialSection]);
  const [hrStore, setHrStore] = useState(() => loadHrStore(tenantId, activeBranchId));
  const [directoryDeptFilter, setDirectoryDeptFilter] = useState<HrDepartmentId | undefined>(undefined);
  const [staffConfig, setStaffConfig] = useState<Record<string, StaffPayrollConfig>>({});
  const [payrollRecords, setPayrollRecords] = useState(() => loadPayrollStore(tenantId, activeBranchId).payrollRecords);
  const [advances, setAdvances] = useState(() => loadPayrollStore(tenantId, activeBranchId).advances);
  const [allowances, setAllowances] = useState(() => loadPayrollStore(tenantId, activeBranchId).dailyAllowances);
  const [editRatesId, setEditRatesId] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState({ baseSalary: 0, food: 0, transport: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [addOpenSignal, setAddOpenSignal] = useState(0);
  const [openStaffDetailId, setOpenStaffDetailId] = useState<string | null>(null);

  useEffect(() => {
    const store = loadPayrollStore(tenantId, activeBranchId);
    setPayrollRecords(store.payrollRecords);
    setAdvances(store.advances);
    setAllowances(store.dailyAllowances);
    let cancelled = false;
    void fetchPayrollContractsMerged(store.staffConfig).then(merged => {
      if (cancelled) return;
      setStaffConfig(merged);
      savePayrollStore(tenantId, { ...store, staffConfig: merged }, activeBranchId);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId, activeBranchId, staffList.length]);

  useEffect(() => {
    let cancelled = false;
    const local = loadHrStore(tenantId, activeBranchId);
    setHrStore(local);
    if (!api.hasValidSession()) return;
    void api
      .getHrWorkspace(activeBranchId)
      .then(remote => {
        if (cancelled) return;
        const hasRemote =
          (remote.applicants?.length ?? 0) > 0 ||
          (remote.timeOff?.length ?? 0) > 0 ||
          (remote.appraisals?.length ?? 0) > 0;
        if (hasRemote) {
          const next: HrStoreSnapshot = {
            applicants: remote.applicants as HrStoreSnapshot['applicants'],
            timeOff: remote.timeOff as HrStoreSnapshot['timeOff'],
            appraisals: remote.appraisals as HrStoreSnapshot['appraisals'],
          };
          setHrStore(next);
          saveHrStore(tenantId, next, activeBranchId);
        } else if (local.applicants.length > 0) {
          void api.saveHrWorkspace(local, activeBranchId);
        }
      })
      .catch(() => {
        /* offline — keep local */
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, activeBranchId]);

  const persistHr = (patch: Partial<HrStoreSnapshot>) => {
    setHrStore(prev => {
      const next = { ...prev, ...patch };
      saveHrStore(tenantId, next, activeBranchId);
      if (api.hasValidSession()) {
        void api.saveHrWorkspace(next, activeBranchId).catch(() => undefined);
      }
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const cashierBoard = useMemo(() => computeCashierLeaderboard(sales), [sales]);
  const topCashier = cashierBoard[0];

  const staffWithStats = useMemo(() => {
    return staffList.map(s => {
      const row = cashierBoard.find(
        r =>
          r.cashierName.toLowerCase() === s.name.toLowerCase() ||
          r.cashierName.toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(r.cashierName.toLowerCase()),
      );
      const shift = getOpenCashierShift(tenantId, s.id);
      const posho = findTodayAllowanceClaim(s.id, today, allowances);
      const unpaid = !payrollRecords.some(p => p.staffId === s.id && p.monthYear === month);
      const pendingAdv = advances.filter(a => a.staffId === s.id && a.status === 'pending');
      const cfg = staffConfig[s.id] ?? {};
      return {
        ...s,
        todaySalesCount: row?.receipts ?? s.todaySalesCount ?? 0,
        todayRevenueTzs: row?.revenue ?? s.todayRevenueTzs ?? 0,
        shiftOpen: Boolean(shift),
        shiftOpenedAt: shift?.openedAt,
        poshoClaimed: Boolean(posho),
        poshoAmount: posho?.totalAmount ?? 0,
        payrollUnpaid: unpaid,
        pendingAdvances: pendingAdv.length,
        pendingAdvanceAmount: pendingAdv.reduce((sum, a) => sum + (a.requestedAmount || 0), 0),
        baseSalary: cfg.baseSalary ?? s.baseSalary ?? 450000,
        food: cfg.dailyFoodAllowance ?? s.dailyFoodAllowance ?? 5000,
        transport: cfg.dailyTransportAllowance ?? s.dailyTransportAllowance ?? 3000,
      };
    });
  }, [staffList, cashierBoard, tenantId, today, allowances, payrollRecords, advances, staffConfig, month]);

  const activeCount = staffWithStats.filter(s => s.active).length;
  const onShiftCount = staffWithStats.filter(s => s.shiftOpen).length;
  const unpaidPayrollCount = staffWithStats.filter(s => s.active && s.payrollUnpaid).length;
  const pendingAdvanceCount = advances.filter(a => a.status === 'pending').length;
  const poshoTodayCount = staffWithStats.filter(s => s.poshoClaimed).length;
  const teamRevenueToday = staffWithStats.reduce((sum, s) => sum + s.todayRevenueTzs, 0);

  const persistConfig = (next: Record<string, StaffPayrollConfig>) => {
    setStaffConfig(next);
    const store = loadPayrollStore(tenantId, activeBranchId);
    savePayrollStore(tenantId, { ...store, staffConfig: next }, activeBranchId);
    for (const s of staffList) {
      const cfg = next[s.id];
      if (cfg) void pushPayrollContractToApi(s.id, s.name, cfg).catch(() => undefined);
    }
  };

  const openRateEditor = (staff: (typeof staffWithStats)[number]) => {
    setEditRatesId(staff.id);
    setRateDraft({
      baseSalary: staff.baseSalary,
      food: staff.food,
      transport: staff.transport,
    });
  };

  const saveRates = () => {
    if (!editRatesId) return;
    const next = {
      ...staffConfig,
      [editRatesId]: {
        ...staffConfig[editRatesId],
        baseSalary: rateDraft.baseSalary,
        dailyFoodAllowance: rateDraft.food,
        dailyTransportAllowance: rateDraft.transport,
      },
    };
    persistConfig(next);
    setStaffList(prev =>
      prev.map(s =>
        s.id === editRatesId
          ? {
              ...s,
              baseSalary: rateDraft.baseSalary,
              dailyFoodAllowance: rateDraft.food,
              dailyTransportAllowance: rateDraft.transport,
            }
          : s,
      ),
    );
    setEditRatesId(null);
    showToast(isSw ? 'Malipo yamesasishwa.' : 'Compensation updated.');
  };

  if (!canTeam && !canPay) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-3">
        <Users className="w-10 h-10 text-[#6264A7] mx-auto" />
        <h2 className="text-lg font-bold text-[#323130]">
          {isSw ? 'Hakuna ruhusa' : 'Access restricted'}
        </h2>
        <p className="text-sm text-[#605E5C]">
          {isSw
            ? 'Moduli ya Watu inapatikana kwa mmiliki, HR na wasimamizi.'
            : 'The People module is available to owners, HR, and managers.'}
        </p>
      </div>
    );
  }

  const sectionCards: Array<{
    id: PeopleTab;
    label: string;
    hint: string;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      id: 'directory',
      label: isSw ? 'Wafanyakazi' : 'Employees',
      hint: isSw ? 'Ongeza, hariri, angalia wasifu' : 'Add, edit, view profiles',
      icon: <Users className="w-5 h-5" />,
      accent: 'bg-[#107C10]',
    },
    {
      id: 'payroll',
      label: isSw ? 'Mishahara' : 'Payroll',
      hint: isSw ? 'PAYE, NSSF, slip za mshahara' : 'PAYE, NSSF, payslips',
      icon: <Banknote className="w-5 h-5" />,
      accent: 'bg-[#714b67]',
    },
    {
      id: 'timeoff',
      label: isSw ? 'Likizo' : 'Time off',
      hint: isSw ? 'Maombi na idhini' : 'Requests & approvals',
      icon: <CalendarOff className="w-5 h-5" />,
      accent: 'bg-[#6264A7]',
    },
    {
      id: 'recruitment',
      label: isSw ? 'Kuajiri' : 'Recruitment',
      hint: isSw ? 'Mwombaji na kuajiri' : 'Applicants & hiring',
      icon: <UserPlus className="w-5 h-5" />,
      accent: 'bg-sky-600',
    },
    {
      id: 'reporting',
      label: isSw ? 'Ripoti HR' : 'HR reports',
      hint: isSw ? 'Pakua na uchambuzi' : 'Exports & summaries',
      icon: <BarChart3 className="w-5 h-5" />,
      accent: 'bg-[#0F2347]',
    },
    {
      id: 'overview',
      label: isSw ? 'Muhtasari' : 'Overview',
      hint: isSw ? 'Takwimu za timu' : 'Team snapshot',
      icon: <LayoutDashboard className="w-5 h-5" />,
      accent: 'bg-emerald-700',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-300">
      {toast && (
        <ToastPortal>
          <div className="bg-[#107C10] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            {toast}
          </div>
        </ToastPortal>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6264A7]/10 text-[#6264A7]">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#323130] tracking-tight">
                {isSw ? 'Watu & HR' : 'People & HR'}
              </h1>
              <p className="text-sm text-[#605E5C]">
                {activeBranchName ? (
                  <>
                    <span className="font-semibold text-[#0F2347]">{activeBranchName}</span>
                    {' · '}
                  </>
                ) : null}
                {isSw
                  ? 'Chagua kazi moja — usichanganye skrini nyingi.'
                  : 'Pick one task — no cluttered screens.'}
              </p>
            </div>
          </div>
        </div>
        {canTeam && (
          <button
            type="button"
            onClick={() => {
              setTab('directory');
              setAddOpenSignal(n => n + 1);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#107C10] hover:bg-[#0e6b0e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {isSw ? 'Ongeza Mfanyakazi' : 'Add staff'}
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="bg-white rounded-xl border border-[#E1DFDD] p-4">
          <p className="text-[11px] font-semibold text-[#605E5C]">{isSw ? 'Wafanyakazi hai' : 'Active staff'}</p>
          <p className="text-2xl font-black text-[#323130] mt-1">
            {activeCount}
            <span className="text-sm font-bold text-[#8A8886]"> / {staffList.length}</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E1DFDD] p-4">
          <p className="text-[11px] font-semibold text-[#605E5C]">{isSw ? 'Mishahara haijasubiri' : 'Payroll due'}</p>
          <p className={`text-2xl font-black mt-1 ${unpaidPayrollCount ? 'text-rose-600' : 'text-emerald-700'}`}>
            {unpaidPayrollCount}
          </p>
        </div>
      </div>

      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sectionCards.map(card => (
            <button
              key={card.id}
              type="button"
              onClick={() => setTab(card.id)}
              className="text-left rounded-2xl border border-[#E1DFDD] bg-white p-4 shadow-sm hover:shadow-md hover:border-[#6264A7]/30 transition-all cursor-pointer"
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-white ${card.accent}`}>
                {card.icon}
              </span>
              <h2 className="mt-3 text-sm font-bold text-[#323130]">{card.label}</h2>
              <p className="mt-1 text-xs text-[#605E5C]">{card.hint}</p>
            </button>
          ))}
          {onNavigate && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('allowances')}
                className="text-left rounded-2xl border border-[#E1DFDD] bg-white p-4 shadow-sm hover:shadow-md cursor-pointer"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white bg-amber-600">
                  <HandCoins className="w-5 h-5" />
                </span>
                <h2 className="mt-3 text-sm font-bold text-[#323130]">{isSw ? 'Posho' : 'Stipends'}</h2>
                <p className="mt-1 text-xs text-[#605E5C]">{isSw ? 'Madai ya chakula/usafiri' : 'Daily food & transport'}</p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('advances')}
                className="text-left rounded-2xl border border-[#E1DFDD] bg-white p-4 shadow-sm hover:shadow-md cursor-pointer"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white bg-sky-600">
                  <CircleDollarSign className="w-5 h-5" />
                </span>
                <h2 className="mt-3 text-sm font-bold text-[#323130]">{isSw ? 'Mikopo' : 'Advances'}</h2>
                <p className="mt-1 text-xs text-[#605E5C]">{isSw ? 'Maombi ya mshahara mapema' : 'Salary advance requests'}</p>
              </button>
            </>
          )}
        </div>
      )}

      {tab !== 'dashboard' && tab !== 'payroll' && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('dashboard')}
            className="text-xs font-bold text-[#6264A7] hover:underline cursor-pointer"
          >
            ← {isSw ? 'Rudi kwenye kadi' : 'Back to menu'}
          </button>
          <span className="text-xs text-[#605E5C]">
            · {sectionCards.find(c => c.id === tab)?.label ?? tab}
          </span>
        </div>
      )}

      {(tab === 'payroll' || tab === 'overview') && (
        <button
          type="button"
          onClick={() => setTab('dashboard')}
          className="text-xs font-bold text-[#6264A7] hover:underline cursor-pointer"
        >
          ← {isSw ? 'Rudi kwenye kadi' : 'Back to menu'}
        </button>
      )}

      {tab === 'payroll' && canPay && (
        <PayrollTanzaniaHub
          language={language}
          staffList={staffList}
          staffConfig={staffConfig}
          onStaffConfigChange={next => persistConfig(next)}
          businessName={currentUser?.businessName || undefined}
          branchName={activeBranchName || undefined}
          branchId={activeBranchId}
          tenantId={tenantId}
          currentUser={currentUser}
          onNavigateToAccounting={onNavigateToAccounting}
          onOpenStaffRecord={id => {
            if (id === 'new') {
              setTab('directory');
              setAddOpenSignal(n => n + 1);
              return;
            }
            setOpenStaffDetailId(id);
            setTab('directory');
          }}
          onShowToast={showToast}
        />
      )}

      {tab === 'payroll' && !canPay && (
        <p className="text-sm text-[#605E5C] p-4 bg-white rounded-xl border">
          {isSw ? 'Huna ruhusa ya mishahara.' : 'You do not have payroll permissions.'}
        </p>
      )}

      {tab === 'overview' && (
        <div className="space-y-4">
          <HrOdooDashboard
            language={language}
            staffList={staffList}
            timeOff={hrStore.timeOff}
            applicants={hrStore.applicants}
            appraisals={hrStore.appraisals}
            onOpenEmployees={dept => {
              setDirectoryDeptFilter(dept);
              setTab('directory');
            }}
            onOpenRecruitment={() => setTab('recruitment')}
            onOpenTimeOff={() => setTab('timeoff')}
            onOpenAppraisals={() => setTab('appraisals')}
            onOpenReporting={() => setTab('reporting')}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#d4e8dc] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e7f5ec] flex items-center justify-between bg-[#f5faf7]">
                <h3 className="text-sm font-bold text-[#1a3d2e]">
                  {isSw ? 'Utendaji wa leo (POS)' : "Today's POS performance"}
                </h3>
                {topCashier && (
                  <span className="text-[11px] font-bold text-[#107C10]">
                    🏆 {topCashier.cashierName} · {formatTSh(topCashier.revenue)}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-[#e7f5ec] text-[#3d5c4a] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-4 text-left">{isSw ? 'Mfanyakazi' : 'Employee'}</th>
                      <th className="py-2 px-3 text-right">{isSw ? 'Mapato' : 'Revenue'}</th>
                      <th className="py-2 px-3 text-left">{isSw ? 'Hali' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef5f0]">
                    {staffWithStats
                      .slice()
                      .sort((a, b) => b.todayRevenueTzs - a.todayRevenueTzs)
                      .slice(0, 8)
                      .map(s => (
                        <tr key={s.id}>
                          <td className="py-2 px-4 font-semibold">{s.name}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatTSh(s.todayRevenueTzs)}</td>
                          <td className="py-2 px-3">
                            {s.shiftOpen ? (isSw ? 'Zamu' : 'On shift') : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#d4e8dc] p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#1a3d2e] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {isSw ? 'Foleni ya HR' : 'HR queues'}
              </h3>
              <ul className="space-y-2 text-xs text-[#5a7a68]">
                <li className="flex justify-between">
                  <span>{isSw ? 'Likizo inayosubiri' : 'Pending time off'}</span>
                  <span className="font-bold">{hrStore.timeOff.filter(t => t.status === 'pending').length}</span>
                </li>
                <li className="flex justify-between">
                  <span>{isSw ? 'Mikopo' : 'Advances'}</span>
                  <span className="font-bold">{pendingAdvanceCount}</span>
                </li>
                <li className="flex justify-between">
                  <span>{isSw ? 'Mishahara' : 'Payroll'}</span>
                  <span className="font-bold">{unpaidPayrollCount}</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setTab('payroll')}
                className="w-full px-3 py-2 rounded-lg bg-[#714b67] text-white text-xs font-bold cursor-pointer"
              >
                {isSw ? 'Kituo cha mishahara' : 'Open payroll workspace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'recruitment' && (
        <HrRecruitmentKanban
          language={language}
          applicants={hrStore.applicants}
          onChange={applicants => persistHr({ applicants })}
          onHire={() =>
            showToast(
              isSw
                ? 'Mwombaji ameajiriwa — kamilisha rekodi kwenye Wafanyakazi.'
                : 'Applicant hired — complete the employee record under Employees.',
            )
          }
        />
      )}

      {tab === 'timeoff' && (
        <HrTimeOffPanel
          language={language}
          staffList={staffList}
          requests={hrStore.timeOff}
          onChange={timeOff => persistHr({ timeOff })}
        />
      )}

      {tab === 'appraisals' && (
        <HrAppraisalsPanel
          language={language}
          staffList={staffList}
          appraisals={hrStore.appraisals}
          onChange={appraisals => persistHr({ appraisals })}
        />
      )}

      {tab === 'reporting' && (
        <HrReportingPanel language={language} staffList={staffList} branchName={activeBranchName || undefined} />
      )}

      {tab === 'directory' && canTeam && (
        <div className="space-y-4">
          {directoryDeptFilter && (
            <button
              type="button"
              onClick={() => setDirectoryDeptFilter(undefined)}
              className="text-xs font-bold text-[#107C10] cursor-pointer"
            >
              {isSw ? 'Onyesha idara zote' : 'Show all departments'}
            </button>
          )}
        <div className="bg-white rounded-xl border border-[#d4e8dc] p-4 md:p-5">
          <StaffTeamPanel
            language={language}
            staffList={staffList}
            setStaffList={setStaffList}
            currentUser={currentUser}
            activeBranchId={activeBranchId}
            activeBranchName={activeBranchName}
            initialAddOpen={staffList.length === 0}
            addOpenSignal={addOpenSignal}
            openStaffId={openStaffDetailId}
            onDetailClosed={() => setOpenStaffDetailId(null)}
          />
        </div>
        </div>
      )}

      {tab === 'directory' && !canTeam && (
        <p className="text-sm text-[#605E5C]">
          {isSw ? 'Orodha inapatikana kwa mmiliki/msimamizi.' : 'Directory is available to owners/managers.'}
        </p>
      )}

      {tab === 'compensation' && (
        <div className="bg-white rounded-xl border border-[#E1DFDD] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EDEBE9]">
            <h3 className="text-sm font-bold text-[#323130]">
              {isSw ? 'Mishahara na posho kwa kila mfanyakazi' : 'Salary & stipend rates per employee'}
            </h3>
            <p className="text-[11px] text-[#605E5C] mt-0.5">
              {isSw
                ? 'Msingi wa mwezi, chakula, na usafiri — hutumika kwenye payroll na madai ya posho.'
                : 'Monthly base, food, and transport — used by payroll and stipend claims.'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F8F8] text-[#605E5C] uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4 text-left">{isSw ? 'Mfanyakazi' : 'Employee'}</th>
                  <th className="py-2.5 px-3 text-right">{isSw ? 'Mshahara' : 'Base salary'}</th>
                  <th className="py-2.5 px-3 text-right">{isSw ? 'Chakula/siku' : 'Food/day'}</th>
                  <th className="py-2.5 px-3 text-right">{isSw ? 'Usafiri/siku' : 'Transit/day'}</th>
                  <th className="py-2.5 px-3 text-right">{isSw ? 'Posho/siku' : 'Stipend/day'}</th>
                  <th className="py-2.5 px-4 text-right">{isSw ? 'Vitendo' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEBE9]">
                {staffWithStats.map(s => (
                  <tr key={s.id} className={!s.active ? 'opacity-50' : ''}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#323130]">{s.name}</div>
                      <div className="text-[10px] text-[#605E5C]">{s.role}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{formatTSh(s.baseSalary)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatTSh(s.food)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatTSh(s.transport)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatTSh(s.food + s.transport)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenStaffDetailId(s.id);
                            setTab('directory');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#107C10]/10 text-[#107C10] text-[10px] font-bold hover:bg-[#107C10]/20 cursor-pointer"
                        >
                          {isSw ? 'Angalia' : 'View'}
                        </button>
                        {canPay && (
                          <button
                            type="button"
                            onClick={() => openRateEditor(s)}
                            className="px-2.5 py-1 rounded-lg border border-[#E1DFDD] text-[10px] font-bold hover:bg-[#F3F2F1] cursor-pointer"
                          >
                            {isSw ? 'Hariri' : 'Edit'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="bg-white rounded-xl border border-[#E1DFDD] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EDEBE9]">
            <h3 className="text-sm font-bold text-[#323130]">
              {isSw ? `Mahudhurio — ${today}` : `Attendance — ${today}`}
            </h3>
            <p className="text-[11px] text-[#605E5C] mt-0.5">
              {isSw
                ? 'Zamu zilizofunguliwa kwenye POS na hali ya posho ya leo.'
                : 'POS open shifts and today’s stipend claim status.'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F8F8] text-[#605E5C] uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4 text-left">{isSw ? 'Mfanyakazi' : 'Employee'}</th>
                  <th className="py-2.5 px-3 text-left">{isSw ? 'Zamu iliyopangwa' : 'Scheduled shift'}</th>
                  <th className="py-2.5 px-3 text-left">{isSw ? 'Zamu sasa' : 'Live shift'}</th>
                  <th className="py-2.5 px-3 text-left">Posho</th>
                  <th className="py-2.5 px-3 text-right">{isSw ? 'Mauzo leo' : 'Sales today'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEBE9]">
                {staffWithStats.map(s => (
                  <tr key={s.id}>
                    <td className="py-3 px-4 font-semibold text-[#323130]">{s.name}</td>
                    <td className="py-3 px-3 text-[#605E5C]">{s.shift || '—'}</td>
                    <td className="py-3 px-3">
                      {s.shiftOpen ? (
                        <span className="text-violet-700 font-bold">
                          {isSw ? 'Wazi' : 'Open'}
                          {s.shiftOpenedAt
                            ? ` · ${new Date(s.shiftOpenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : ''}
                        </span>
                      ) : (
                        <span className="text-[#8A8886]">{isSw ? 'Haipo' : 'Closed'}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {s.poshoClaimed ? (
                        <span className="text-emerald-700 font-bold">{formatTSh(s.poshoAmount)}</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">{isSw ? 'Haijadaiwa' : 'Not claimed'}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{formatTSh(s.todayRevenueTzs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editRatesId && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E1DFDD] shadow-xl max-w-sm w-full p-5 text-xs space-y-3">
            <h4 className="font-bold text-sm text-[#323130]">
              {isSw ? 'Hariri malipo' : 'Edit compensation'}
            </h4>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-[#605E5C]">{isSw ? 'Mshahara wa mwezi' : 'Monthly base'}</span>
              <input
                type="number"
                min={0}
                value={rateDraft.baseSalary}
                onChange={e => setRateDraft(prev => ({ ...prev, baseSalary: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-[#E1DFDD] rounded-lg font-mono"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-[#605E5C]">{isSw ? 'Posho chakula / siku' : 'Food stipend / day'}</span>
              <input
                type="number"
                min={0}
                value={rateDraft.food}
                onChange={e => setRateDraft(prev => ({ ...prev, food: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-[#E1DFDD] rounded-lg font-mono"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-[#605E5C]">{isSw ? 'Posho usafiri / siku' : 'Transit stipend / day'}</span>
              <input
                type="number"
                min={0}
                value={rateDraft.transport}
                onChange={e => setRateDraft(prev => ({ ...prev, transport: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-[#E1DFDD] rounded-lg font-mono"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditRatesId(null)} className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer">
                {isSw ? 'Ghairi' : 'Cancel'}
              </button>
              <button type="button" onClick={saveRates} className="px-4 py-2 rounded-lg bg-[#107C10] text-white text-xs font-bold cursor-pointer">
                {isSw ? 'Hifadhi' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffUsersView;
