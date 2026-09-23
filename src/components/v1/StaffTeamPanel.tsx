import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Users,
  ShieldCheck,
  CheckCircle2,
  X,
  Eye,
} from 'lucide-react';
import { StaffAvatar } from '@/components/v1/hr/StaffAvatar';
import { StaffDetailDrawer } from '@/components/v1/hr/StaffDetailDrawer';
import { api } from '@/lib/api';
import { resolveStaffPermissions } from '@/lib/apiSync';
import { canManageStaffRBAC } from '@/lib/rbac';
import { loadPayrollStore, savePayrollStore } from '@/lib/payrollStore';
import { pushPayrollContractToApi } from '@/lib/payrollApiSync';
import {
  defaultStaffPayrollDraft,
  draftFromStaffAndConfig,
  StaffPayrollFormFields,
  staffConfigFromDraft,
  staffPermissionsPayloadFromDraft,
  type StaffPayrollFormDraft,
} from '@/components/v1/hr/StaffPayrollFormFields';
import { formatApiError } from '@/lib/formatApiError';
import { ModalPortal, ToastPortal } from '@/components/ui/ModalPortal';
import type { AuthUser, Language, StaffMember, StaffPermissions, StaffRole } from '@/types/v1';

interface StaffTeamPanelProps {
  language: Language;
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  currentUser?: AuthUser | null;
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  /** Open the Add Staff dialog immediately (e.g. when landing on Watu). */
  initialAddOpen?: boolean;
  /** External signal to open Add Staff (increments / changes to trigger). */
  addOpenSignal?: number;
  /** Open employee detail drawer for this staff id. */
  openStaffId?: string | null;
  onDetailClosed?: () => void;
}

const defaultPermissions = (): StaffPermissions => ({
  canSellPOS: false,
  canGiveCredit: false,
  canModifyInventory: false,
  canViewInventory: false,
  canViewProfitReports: false,
  canManageSuppliers: false,
  canApproveDiscounts: false,
  canOverridePrices: false,
  canVoidReceipts: false,
  canPerformDailyClosing: false,
  canAccessSuperAdmin: false,
});

function rolePreset(role: StaffRole): StaffPermissions {
  const base = defaultPermissions();
  if (role === 'Cashier') {
    return { ...base, canSellPOS: true, canViewInventory: true, canPerformDailyClosing: true };
  }
  if (role === 'Pharmacist') {
    return {
      ...base,
      canSellPOS: true,
      canGiveCredit: true,
      canModifyInventory: true,
      canViewInventory: true,
      canManageSuppliers: true,
      canApproveDiscounts: true,
      canOverridePrices: true,
      canVoidReceipts: true,
    };
  }
  if (role === 'Storekeeper') {
    return { ...base, canModifyInventory: true, canViewInventory: true, canManageSuppliers: true };
  }
  if (role === 'Accountant') {
    return {
      ...base,
      canSellPOS: true,
      canGiveCredit: true,
      canModifyInventory: true,
      canViewInventory: true,
      canViewProfitReports: true,
      canManageSuppliers: true,
      canApproveDiscounts: true,
      canVoidReceipts: true,
      canPerformDailyClosing: true,
    };
  }
  if (role === 'HR') {
    return {
      ...base,
      canViewInventory: true,
      canViewProfitReports: true,
    };
  }
  return {
    canSellPOS: true,
    canGiveCredit: true,
    canModifyInventory: true,
    canViewInventory: true,
    canViewProfitReports: true,
    canManageSuppliers: true,
    canApproveDiscounts: true,
    canOverridePrices: true,
    canVoidReceipts: true,
    canPerformDailyClosing: true,
    canAccessSuperAdmin: false,
  };
}

export const StaffTeamPanel: React.FC<StaffTeamPanelProps> = ({
  language,
  staffList,
  setStaffList,
  currentUser,
  activeBranchId,
  activeBranchName,
  initialAddOpen = false,
  addOpenSignal = 0,
  openStaffId = null,
  onDetailClosed,
}) => {
  const isSw = language === 'sw';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [toast, setToast] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(initialAddOpen);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editDraft, setEditDraft] = useState<StaffPayrollFormDraft | null>(null);
  const [detailTarget, setDetailTarget] = useState<StaffMember | null>(null);
  const [addDraft, setAddDraft] = useState<StaffPayrollFormDraft>(() => defaultStaffPayrollDraft('Cashier'));

  const persistPayrollForStaff = (staffId: string, draft: StaffPayrollFormDraft) => {
    const tenantId = currentUser?.businessId || currentUser?.id || 'local';
    const payroll = loadPayrollStore(tenantId, activeBranchId);
    savePayrollStore(
      tenantId,
      {
        ...payroll,
        staffConfig: {
          ...payroll.staffConfig,
          [staffId]: { ...payroll.staffConfig[staffId], ...staffConfigFromDraft(draft) },
        },
      },
      activeBranchId,
    );
    void pushPayrollContractToApi(staffId, draft.name, staffConfigFromDraft(draft)).catch(() => undefined);
  };

  useEffect(() => {
    if (addOpenSignal > 0) setAddOpen(true);
  }, [addOpenSignal]);

  useEffect(() => {
    if (!openStaffId) return;
    const member = staffList.find(s => s.id === openStaffId);
    if (member) setDetailTarget(member);
  }, [openStaffId, staffList]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const filtered = useMemo(() => {
    return staffList.filter(s => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q);
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, search, roleFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDraft.name.trim()) {
      showToast(isSw ? 'Weka jina kamili la mfanyakazi.' : 'Enter the staff member’s full name.');
      return;
    }
    if (!addDraft.email.trim()) {
      showToast(isSw ? 'Weka barua pepe.' : 'Enter an email address.');
      return;
    }
    if (!addDraft.password || addDraft.password.length < 6) {
      showToast(isSw ? 'Nenosiri lazima liwe angalau herufi 6.' : 'Password must be at least 6 characters.');
      return;
    }
    try {
      const perms = rolePreset(addDraft.role);
      const created = (await api.createStaff({
        name: addDraft.name.trim(),
        email: addDraft.email.trim().toLowerCase(),
        phone: addDraft.phone,
        role: addDraft.role,
        password: addDraft.password,
        ...(activeBranchId ? { branch_id: activeBranchId } : {}),
      })) as Record<string, unknown>;

      const staffId = created.id as string;
      try {
        await api.updateStaff(staffId, {
          permissions: staffPermissionsPayloadFromDraft(addDraft, perms),
        });
      } catch {
        // Staff account exists; payroll/photo can be saved locally even if PATCH fails on legacy API.
      }

      const member: StaffMember = {
        id: staffId,
        name: created.name as string,
        role: (created.role as StaffMember['role']) ?? addDraft.role,
        email: created.email as string,
        phone: (created.phone as string) ?? addDraft.phone,
        baseSalary: addDraft.baseSalary,
        nssfNumber: addDraft.nssfNumber || undefined,
        accountNumberOrPhone: addDraft.bankAccount || undefined,
        active: Boolean(created.active ?? true),
        joinedDate: addDraft.hireDate || new Date().toISOString().split('T')[0],
        branch: activeBranchName || 'HQ',
        branchId: activeBranchId || (created.branch_id as string | undefined),
        shift: addDraft.shift,
        todaySalesCount: 0,
        todayRevenueTzs: 0,
        lastActive: new Date().toISOString().slice(0, 10),
        avatarUrl: addDraft.avatarPreview,
        permissions: perms,
      };
      setStaffList(prev => [member, ...prev]);
      persistPayrollForStaff(member.id, addDraft);
      setAddOpen(false);
      setAddDraft(defaultStaffPayrollDraft('Cashier'));
      showToast(isSw ? `${member.name} amesajiliwa.` : `${member.name} added to team.`);
    } catch (err) {
      showToast(formatApiError(err, isSw));
    }
  };

  const openEdit = (staff: StaffMember) => {
    const tenantId = currentUser?.businessId || currentUser?.id || 'local';
    const cfg = loadPayrollStore(tenantId, activeBranchId).staffConfig[staff.id];
    setEditTarget(staff);
    setEditDraft(draftFromStaffAndConfig(staff, cfg));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editDraft) return;
    try {
      const payload: Record<string, unknown> = {
        name: editDraft.name,
        phone: editDraft.phone,
        role: editDraft.role,
        active: editTarget.active,
      };
      if (editDraft.avatarPreview) payload.avatar_url = editDraft.avatarPreview;
      await api.updateStaff(editTarget.id, payload);
      const updated: StaffMember = {
        ...editTarget,
        name: editDraft.name,
        phone: editDraft.phone,
        role: editDraft.role,
        baseSalary: editDraft.baseSalary,
        nssfNumber: editDraft.nssfNumber || undefined,
        accountNumberOrPhone: editDraft.bankAccount || undefined,
        joinedDate: editDraft.hireDate,
        shift: editDraft.shift,
        avatarUrl: editDraft.avatarPreview ?? editTarget.avatarUrl,
        permissions: rolePreset(editDraft.role),
      };
      setStaffList(prev => prev.map(s => (s.id === editTarget.id ? updated : s)));
      persistPayrollForStaff(editTarget.id, editDraft);
      setEditTarget(null);
      setEditDraft(null);
      showToast(isSw ? 'Taarifa zimesasishwa.' : 'Staff profile updated.');
    } catch {
      showToast(isSw ? 'Imeshindikana kusasisha.' : 'Update failed.');
    }
  };

  const toggleActive = async (staff: StaffMember) => {
    const next = { ...staff, active: !staff.active };
    try {
      await api.updateStaff(staff.id, { active: next.active });
      setStaffList(prev => prev.map(s => (s.id === staff.id ? next : s)));
      showToast(next.active ? (isSw ? 'Akaunti imewezeshwa.' : 'Staff reactivated.') : (isSw ? 'Akaunti imesimamishwa.' : 'Staff suspended.'));
    } catch {
      setStaffList(prev => prev.map(s => (s.id === staff.id ? next : s)));
    }
  };

  const saveDetail = async (staff: StaffMember, avatarUrl?: string | null) => {
    const payload: Record<string, unknown> = {
      name: staff.name,
      phone: staff.phone,
      role: staff.role,
      active: staff.active,
    };
    if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;
    await api.updateStaff(staff.id, payload);
    setStaffList(prev =>
      prev.map(s =>
        s.id === staff.id
          ? {
              ...staff,
              avatarUrl:
                avatarUrl === ''
                  ? undefined
                  : avatarUrl ?? staff.avatarUrl,
            }
          : s,
      ),
    );
    showToast(isSw ? 'Wasifu umehifadhiwa.' : 'Profile saved.');
  };

  const confirmDelete = async (staff: StaffMember) => {
    try {
      await api.updateStaff(staff.id, { active: false });
    } catch {
      /* local fallback */
    }
    setStaffList(prev => prev.filter(s => s.id !== staff.id));
    setDeleteTarget(null);
    showToast(isSw ? 'Mfanyakazi ameondolewa.' : 'Staff removed from team.');
  };

  return (
    <div className="space-y-4">
      {toast && (
        <ToastPortal>
          <div className="bg-[#107C10] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            {toast}
          </div>
        </ToastPortal>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#323130] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6264A7]" />
            {isSw ? 'Timu ya Wafanyakazi' : 'Staff Team'}
          </h3>
          <p className="text-[11px] text-[#605E5C] mt-0.5">
            {isSw
              ? 'Ongeza, badilisha nafasi, au ondoa wafanyakazi kutoka hapa.'
              : 'Add, update roles, suspend or remove staff from your business.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-3.5 py-2 bg-[#107C10] hover:bg-[#0e6b0e] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {isSw ? 'Ongeza Mfanyakazi' : 'Add Staff'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isSw ? 'Tafuta mfanyakazi...' : 'Search staff...'}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E1DFDD] rounded-lg bg-[#FAFAFA]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-[#E1DFDD] rounded-lg bg-white font-medium"
        >
          <option value="all">{isSw ? 'Nafasi zote' : 'All roles'}</option>
          {(['Cashier', 'Pharmacist', 'Storekeeper', 'Accountant', 'HR', 'Manager', 'Owner'] as StaffRole[]).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#E1DFDD] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F8F8] text-[#605E5C] uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-4 text-left">{isSw ? 'Mfanyakazi' : 'Member'}</th>
                <th className="py-2.5 px-3 text-left">{isSw ? 'Nafasi' : 'Role'}</th>
                <th className="py-2.5 px-3 text-left">{isSw ? 'Mamlaka' : 'Access'}</th>
                <th className="py-2.5 px-3 text-left">{isSw ? 'Hali' : 'Status'}</th>
                <th className="py-2.5 px-4 text-right">{isSw ? 'Vitendo' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEBE9]">
              {filtered.map(staff => {
                const perms = resolveStaffPermissions(staff);
                const isSelf = currentUser?.staffId === staff.id;
                return (
                  <tr key={staff.id} className="hover:bg-[#FAFBFC]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <StaffAvatar staff={staff} size="md" />
                        <div className="min-w-0">
                          <div className="font-semibold text-[#323130] truncate">{staff.name}</div>
                          <div className="text-[10px] text-[#605E5C] truncate">{staff.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#F3F2F1] text-[10px] font-bold">{staff.role}</span>
                      <div className="text-[10px] text-[#605E5C] mt-1">{staff.branch}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {perms.canSellPOS && <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-semibold">POS</span>}
                        {perms.canModifyInventory && <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-semibold">Stock</span>}
                        {perms.canViewProfitReports && <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-semibold">Reports</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(staff)}
                        disabled={isSelf}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer disabled:opacity-50 ${
                          staff.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {staff.active ? (isSw ? 'Hai' : 'Active') : (isSw ? 'Imesimamishwa' : 'Suspended')}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailTarget(staff)}
                          className="px-2 py-1 rounded-lg bg-[#107C10]/10 text-[#107C10] text-[10px] font-bold hover:bg-[#107C10]/20 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isSw ? 'Angalia' : 'View'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(staff)}
                          className="p-1.5 rounded-lg hover:bg-[#F3F2F1] text-[#605E5C] cursor-pointer"
                          title={isSw ? 'Hariri' : 'Edit'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(staff)}
                          disabled={isSelf}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer disabled:opacity-40"
                          title={isSw ? 'Ondoa' : 'Remove'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#605E5C]">
                    {isSw ? 'Hakuna wafanyakazi waliopatikana.' : 'No staff members found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalPortal open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="bg-white rounded-2xl border border-[#E1DFDD] shadow-xl max-w-2xl w-full p-5 sm:p-6 text-xs max-h-[min(92vh,920px)] overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-[#EDEBE9] -mt-1 pt-1 z-10">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6264A7]" />
              {isSw ? 'Sajili Mfanyakazi Mpya' : 'Add New Staff'}
            </h4>
            <button type="button" onClick={() => setAddOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <StaffPayrollFormFields draft={addDraft} onChange={setAddDraft} isSw={isSw} mode="create" />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDEBE9]">
              <button type="button" onClick={() => setAddOpen(false)} className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer">
                {isSw ? 'Ghairi' : 'Cancel'}
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#107C10] text-white text-xs font-bold cursor-pointer">
                {isSw ? 'Hifadhi' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <ModalPortal
        open={Boolean(editTarget && editDraft)}
        onClose={() => {
          setEditTarget(null);
          setEditDraft(null);
        }}
      >
        <div className="bg-white rounded-2xl border border-[#E1DFDD] shadow-xl max-w-2xl w-full p-5 sm:p-6 text-xs max-h-[min(92vh,920px)] overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b border-[#EDEBE9] -mt-1 pt-1 z-10">
            <h4 className="font-bold text-sm">{isSw ? 'Hariri Mfanyakazi' : 'Edit staff & payroll profile'}</h4>
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setEditDraft(null);
              }}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {editTarget && editDraft ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <StaffPayrollFormFields
                draft={editDraft}
                onChange={setEditDraft}
                isSw={isSw}
                mode="edit"
                existingStaff={editTarget}
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EDEBE9]">
                <button
                  type="button"
                  onClick={() => {
                    setEditTarget(null);
                    setEditDraft(null);
                  }}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                >
                  {isSw ? 'Ghairi' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[#6264A7] text-white text-xs font-bold cursor-pointer">
                  {isSw ? 'Hifadhi' : 'Update'}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </ModalPortal>

      <ModalPortal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl border border-[#E1DFDD] shadow-xl max-w-sm w-full p-5 text-xs space-y-3">
            <p className="text-[#323130]">
              {isSw
                ? `Ondoa ${deleteTarget?.name} kutoka timu? Hawataweza kuingia tena.`
                : `Remove ${deleteTarget?.name} from the team? They will lose access immediately.`}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-3 py-2 rounded-lg border text-xs font-semibold">
                {isSw ? 'Ghairi' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => deleteTarget && confirmDelete(deleteTarget)}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                {isSw ? 'Ondoa' : 'Remove'}
              </button>
            </div>
          </div>
      </ModalPortal>

      <StaffDetailDrawer
        open={Boolean(detailTarget)}
        staff={detailTarget}
        language={language}
        branchName={activeBranchName}
        canEdit={canManageStaffRBAC(currentUser)}
        baseSalary={
          detailTarget
            ? loadPayrollStore(currentUser?.businessId || currentUser?.id || 'local', activeBranchId).staffConfig[
                detailTarget.id
              ]?.baseSalary
            : undefined
        }
        onClose={() => {
          setDetailTarget(null);
          onDetailClosed?.();
        }}
        onSave={saveDetail}
      />
    </div>
  );
};
