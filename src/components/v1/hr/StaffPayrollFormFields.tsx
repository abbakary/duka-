import React, { useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { StaffAvatar } from '@/components/v1/hr/StaffAvatar';
import { compressLogoFile } from '@/lib/imageCompress';
import type { StaffMember, StaffPermissions, StaffRole } from '@/types/v1';

export interface StaffPayrollFormDraft {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: StaffRole;
  shift: string;
  baseSalary: number;
  housingAllowanceMonthly: number;
  transportAllowanceMonthly: number;
  dailyFoodAllowance: number;
  dailyTransportAllowance: number;
  tin: string;
  nssfNumber: string;
  nationalId: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  hireDate: string;
  contractType: string;
  department: string;
  jobTitle: string;
  heslb: boolean;
  nssfEnabled: boolean;
  payeEnabled: boolean;
  avatarPreview?: string;
}

export function defaultStaffPayrollDraft(role: StaffRole = 'Cashier'): StaffPayrollFormDraft {
  return {
    name: '',
    email: '',
    phone: '+255 7',
    password: '',
    role,
    shift: 'Morning',
    baseSalary: 450_000,
    housingAllowanceMonthly: 54_000,
    transportAllowanceMonthly: 66_000,
    dailyFoodAllowance: 5000,
    dailyTransportAllowance: 3000,
    tin: '',
    nssfNumber: '',
    nationalId: '',
    bankName: 'CRDB Bank',
    bankBranch: 'Kariakoo',
    bankAccount: '',
    hireDate: new Date().toISOString().slice(0, 10),
    contractType: 'Permanent',
    department: 'Operations',
    jobTitle: role,
    heslb: false,
    nssfEnabled: true,
    payeEnabled: true,
  };
}

interface Props {
  draft: StaffPayrollFormDraft;
  onChange: (next: StaffPayrollFormDraft) => void;
  isSw: boolean;
  mode: 'create' | 'edit';
  existingStaff?: Pick<StaffMember, 'name' | 'role' | 'avatarUrl' | 'avatarColor'>;
}

const ROLES: StaffRole[] = ['Cashier', 'Pharmacist', 'Storekeeper', 'Accountant', 'HR', 'Manager'];

export const StaffPayrollFormFields: React.FC<Props> = ({
  draft,
  onChange,
  isSw,
  mode,
  existingStaff,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarStaff: Pick<StaffMember, 'name' | 'role' | 'avatarUrl' | 'avatarColor'> = {
    name: draft.name || existingStaff?.name || '?',
    role: draft.role,
    avatarUrl: draft.avatarPreview || existingStaff?.avatarUrl,
    avatarColor: existingStaff?.avatarColor,
  };

  const set = (patch: Partial<StaffPayrollFormDraft>) => onChange({ ...draft, ...patch });

  const onPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const { dataUrl } = await compressLogoFile(file, 400_000);
    set({ avatarPreview: dataUrl });
  };

  const inputCls = 'w-full px-3 py-2 border border-[#E1DFDD] rounded-lg text-sm';
  const labelCls = 'block text-[10px] font-bold text-[#605E5C] mb-1';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <StaffAvatar staff={avatarStaff} size="xl" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && void onPhoto(e.target.files[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#107C10] cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            {isSw ? 'Picha ya wasifu' : 'Profile photo'}
          </button>
        </div>
        <div className="flex-1 w-full space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#6264A7] flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {isSw ? 'Taarifa za msingi' : 'Identity & access'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => set({ role: r, jobTitle: draft.jobTitle === draft.role ? r : draft.jobTitle })}
                className={`py-2 rounded-lg border text-[10px] font-bold cursor-pointer ${
                  draft.role === r ? 'bg-[#6264A7] text-white border-[#6264A7]' : 'bg-[#FAFAFA] border-[#E1DFDD]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <input required value={draft.name} onChange={e => set({ name: e.target.value })} placeholder={isSw ? 'Jina kamili' : 'Full name'} className={inputCls} />
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              required={mode === 'create'}
              type="email"
              value={draft.email}
              onChange={e => set({ email: e.target.value })}
              placeholder="Email"
              className={inputCls}
              readOnly={mode === 'edit'}
            />
            <input value={draft.phone} onChange={e => set({ phone: e.target.value })} placeholder="+255..." className={inputCls} />
          </div>
          {mode === 'create' ? (
            <input
              required
              type="password"
              minLength={6}
              value={draft.password}
              onChange={e => set({ password: e.target.value })}
              placeholder={isSw ? 'Nenosiri (angalau 6)' : 'Password (min 6)'}
              className={inputCls}
            />
          ) : null}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#714b67] mb-2">
          {isSw ? 'Mshahara na mkataba' : 'Pay & contract'}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <label>
            <span className={labelCls}>{isSw ? 'Mshahara wa msingi (TSh)' : 'Basic salary (TSh)'}</span>
            <input type="number" min={0} value={draft.baseSalary} onChange={e => set({ baseSalary: Number(e.target.value) || 0 })} className={`${inputCls} font-mono`} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Posho ya nyumba' : 'Housing allowance'}</span>
            <input type="number" min={0} value={draft.housingAllowanceMonthly} onChange={e => set({ housingAllowanceMonthly: Number(e.target.value) || 0 })} className={`${inputCls} font-mono`} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Posho ya usafiri (mwezi)' : 'Transport (monthly)'}</span>
            <input type="number" min={0} value={draft.transportAllowanceMonthly} onChange={e => set({ transportAllowanceMonthly: Number(e.target.value) || 0 })} className={`${inputCls} font-mono`} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Tarehe ya kuajiri' : 'Hire date'}</span>
            <input type="date" value={draft.hireDate} onChange={e => set({ hireDate: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Idara' : 'Department'}</span>
            <input value={draft.department} onChange={e => set({ department: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Cheo' : 'Job title'}</span>
            <input value={draft.jobTitle} onChange={e => set({ jobTitle: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Aina ya mkataba' : 'Contract type'}</span>
            <input value={draft.contractType} onChange={e => set({ contractType: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Zamu' : 'Shift'}</span>
            <select value={draft.shift} onChange={e => set({ shift: e.target.value })} className={inputCls}>
              <option value="Morning">{isSw ? 'Asubuhi' : 'Morning'}</option>
              <option value="Afternoon">{isSw ? 'Mchana' : 'Afternoon'}</option>
              <option value="Night">{isSw ? 'Usiku' : 'Night'}</option>
            </select>
          </label>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#038387] mb-2">
          {isSw ? 'Kisheria na benki' : 'Statutory & bank'}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <label>
            <span className={labelCls}>TIN</span>
            <input value={draft.tin} onChange={e => set({ tin: e.target.value })} placeholder="109-442-671" className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>NSSF {isSw ? 'nambari' : 'no.'}</span>
            <input value={draft.nssfNumber} onChange={e => set({ nssfNumber: e.target.value })} placeholder="TZ-NSSF-88234017" className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>NIDA / {isSw ? 'Kitambulisho' : 'National ID'}</span>
            <input value={draft.nationalId} onChange={e => set({ nationalId: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Benki' : 'Bank'}</span>
            <input value={draft.bankName} onChange={e => set({ bankName: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Tawi la benki' : 'Bank branch'}</span>
            <input value={draft.bankBranch} onChange={e => set({ bankBranch: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>{isSw ? 'Nambari ya akaunti' : 'Account number'}</span>
            <input value={draft.bankAccount} onChange={e => set({ bankAccount: e.target.value })} className={inputCls} />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.heslb} onChange={e => set({ heslb: e.target.checked })} />
            HESLB {isSw ? 'mwanufaika wa mkopo' : 'loan beneficiary'}
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.nssfEnabled} onChange={e => set({ nssfEnabled: e.target.checked })} />
            NSSF
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={draft.payeEnabled} onChange={e => set({ payeEnabled: e.target.checked })} />
            PAYE
          </label>
        </div>
      </div>
    </div>
  );
};

export function staffConfigFromDraft(d: StaffPayrollFormDraft) {
  return {
    baseSalary: d.baseSalary,
    housingAllowanceMonthly: d.housingAllowanceMonthly,
    transportAllowanceMonthly: d.transportAllowanceMonthly,
    dailyFoodAllowance: d.dailyFoodAllowance,
    dailyTransportAllowance: d.dailyTransportAllowance,
    tin: d.tin,
    nssfNumber: d.nssfNumber,
    nationalId: d.nationalId,
    bankName: d.bankName,
    bankBranch: d.bankBranch,
    bankAccount: d.bankAccount,
    hireDate: d.hireDate,
    contractType: d.contractType,
    department: d.department,
    jobTitle: d.jobTitle,
    heslb: d.heslb,
    nssfEnabled: d.nssfEnabled,
    payeEnabled: d.payeEnabled,
  };
}

/** Persist RBAC + payroll profile (+ optional avatar) on staff.permissions via PATCH /staff. */
export function staffPermissionsPayloadFromDraft(
  draft: StaffPayrollFormDraft,
  rbac: StaffPermissions,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...rbac,
    payroll_profile: staffConfigFromDraft(draft),
  };
  if (draft.avatarPreview) payload.avatar_url = draft.avatarPreview;
  return payload;
}

export function draftFromStaffAndConfig(
  staff: StaffMember,
  cfg: import('@/lib/payrollStore').StaffPayrollConfig | undefined,
): StaffPayrollFormDraft {
  const basic = cfg?.baseSalary ?? staff.baseSalary ?? 450_000;
  return {
    ...defaultStaffPayrollDraft(staff.role),
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    password: '',
    role: staff.role,
    shift: staff.shift,
    baseSalary: basic,
    housingAllowanceMonthly: cfg?.housingAllowanceMonthly ?? Math.round(basic * 0.12),
    transportAllowanceMonthly: cfg?.transportAllowanceMonthly ?? 66_000,
    dailyFoodAllowance: cfg?.dailyFoodAllowance ?? staff.dailyFoodAllowance ?? 5000,
    dailyTransportAllowance: cfg?.dailyTransportAllowance ?? staff.dailyTransportAllowance ?? 3000,
    tin: cfg?.tin ?? '',
    nssfNumber: cfg?.nssfNumber ?? staff.nssfNumber ?? '',
    nationalId: cfg?.nationalId ?? '',
    bankName: cfg?.bankName ?? 'CRDB Bank',
    bankBranch: cfg?.bankBranch ?? '',
    bankAccount: cfg?.bankAccount ?? staff.accountNumberOrPhone ?? '',
    hireDate: cfg?.hireDate ?? staff.joinedDate ?? new Date().toISOString().slice(0, 10),
    contractType: cfg?.contractType ?? 'Permanent',
    department: cfg?.department ?? 'Operations',
    jobTitle: cfg?.jobTitle ?? staff.role,
    heslb: Boolean(cfg?.heslb),
    nssfEnabled: cfg?.nssfEnabled !== false,
    payeEnabled: cfg?.payeEnabled !== false,
  };
}
