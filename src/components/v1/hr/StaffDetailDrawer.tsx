import React, { useRef, useState } from 'react';
import {
  Mail,
  Phone,
  Building2,
  Shield,
  Camera,
  X,
  Save,
  User,
  Banknote,
} from 'lucide-react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { StaffAvatar } from '@/components/v1/hr/StaffAvatar';
import { resolveStaffPermissions } from '@/lib/apiSync';
import { compressLogoFile } from '@/lib/imageCompress';
import { formatTSh } from '@/utils/translations';
import type { Language, StaffMember } from '@/types/v1';

interface StaffDetailDrawerProps {
  open: boolean;
  staff: StaffMember | null;
  language: Language;
  branchName?: string | null;
  canEdit: boolean;
  baseSalary?: number;
  onClose: () => void;
  onSave: (staff: StaffMember, avatarUrl?: string | null) => Promise<void>;
}

export const StaffDetailDrawer: React.FC<StaffDetailDrawerProps> = ({
  open,
  staff,
  language,
  branchName,
  canEdit,
  baseSalary,
  onClose,
  onSave,
}) => {
  const isSw = language === 'sw';
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<StaffMember | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarClear, setAvatarClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (staff && open) {
      setDraft({ ...staff });
      setAvatarPreview(null);
      setAvatarClear(false);
      setError('');
    }
  }, [staff, open]);

  if (!open || !draft) return null;

  const perms = resolveStaffPermissions(draft);
  const displayAvatar = avatarClear ? undefined : avatarPreview ?? draft.avatarUrl;

  const pickPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(isSw ? 'Chagua picha tu.' : 'Please choose an image file.');
      return;
    }
    setError('');
    try {
      const { dataUrl } = await compressLogoFile(file, 400_000);
      setAvatarPreview(dataUrl);
      setAvatarClear(false);
    } catch {
      setError(isSw ? 'Imeshindikana kusoma picha.' : 'Could not process image.');
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError('');
    try {
      const next = { ...draft, avatarUrl: displayAvatar };
      let avatarPayload: string | null | undefined = undefined;
      if (avatarClear) avatarPayload = '';
      else if (avatarPreview) avatarPayload = avatarPreview;
      await onSave(next, avatarPayload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex justify-end">
        <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
        <aside className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <header className="px-5 py-4 border-b border-[#EDEBE9] flex items-start justify-between gap-3 bg-[#FAFBFC]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#605E5C]">
                {isSw ? 'Wasifu wa mfanyakazi' : 'Employee profile'}
              </p>
              <h2 className="text-lg font-bold text-[#323130] mt-0.5">{draft.name}</h2>
              <p className="text-xs text-[#605E5C]">{draft.role}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F2F1] cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <StaffAvatar staff={{ ...draft, avatarUrl: displayAvatar }} size="xl" />
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#107C10] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-[#0e6b0e]"
                      title={isSw ? 'Pakia picha' : 'Upload photo'}
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) void pickPhoto(f);
                        e.target.value = '';
                      }}
                    />
                  </>
                )}
              </div>
              {canEdit && (displayAvatar || avatarPreview) && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarClear(true);
                    setAvatarPreview(null);
                  }}
                  className="mt-2 text-[11px] font-semibold text-rose-600 cursor-pointer"
                >
                  {isSw ? 'Ondoa picha' : 'Remove photo'}
                </button>
              )}
              <p className="text-[11px] text-[#605E5C] mt-2 max-w-xs">
                {isSw
                  ? 'Pakia picha rasmi ya mfanyakazi (inahifadhiwa kwenye akaunti yake).'
                  : 'Upload an official staff photo — stored on their profile in the backend.'}
              </p>
            </div>

            {error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#605E5C] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {isSw ? 'Mawasiliano' : 'Contact'}
              </h3>
              <label className="block text-[11px] font-semibold text-[#605E5C]">
                {isSw ? 'Jina' : 'Full name'}
                <input
                  disabled={!canEdit}
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E1DFDD] rounded-lg text-sm disabled:bg-[#F3F2F1]"
                />
              </label>
              <label className="block text-[11px] font-semibold text-[#605E5C]">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </span>
                <input
                  disabled
                  value={draft.email}
                  className="mt-1 w-full px-3 py-2 border border-[#E1DFDD] rounded-lg text-sm bg-[#F3F2F1] text-[#605E5C]"
                />
              </label>
              <label className="block text-[11px] font-semibold text-[#605E5C]">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {isSw ? 'Simu' : 'Phone'}
                </span>
                <input
                  disabled={!canEdit}
                  value={draft.phone}
                  onChange={e => setDraft({ ...draft, phone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E1DFDD] rounded-lg text-sm disabled:bg-[#F3F2F1]"
                />
              </label>
              <div className="flex items-center gap-2 text-sm text-[#323130] px-1">
                <Building2 className="w-4 h-4 text-[#605E5C]" />
                {branchName || draft.branch || 'HQ'}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-[#605E5C] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                {isSw ? 'Mamlaka' : 'Access & role'}
              </h3>
              {canEdit ? (
                <select
                  value={draft.role}
                  onChange={e => setDraft({ ...draft, role: e.target.value as StaffMember['role'] })}
                  className="w-full px-3 py-2 border border-[#E1DFDD] rounded-lg text-sm"
                >
                  {(['Cashier', 'Pharmacist', 'Storekeeper', 'Accountant', 'Manager', 'Owner'] as const).map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-semibold">{draft.role}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {perms.canSellPOS && <Badge label="POS" />}
                {perms.canModifyInventory && <Badge label={isSw ? 'Stoo' : 'Inventory'} />}
                {perms.canViewProfitReports && <Badge label={isSw ? 'Ripoti' : 'Reports'} />}
                {perms.canManageSuppliers && <Badge label={isSw ? 'Wasambazaji' : 'Suppliers'} />}
                {perms.canPerformDailyClosing && <Badge label={isSw ? 'Kufunga siku' : 'Closing'} />}
              </div>
            </section>

            {baseSalary != null && baseSalary > 0 && (
              <section className="rounded-xl border border-[#E1DFDD] p-3 bg-[#FAFBFC]">
                <h3 className="text-xs font-bold text-[#605E5C] flex items-center gap-1.5 mb-1">
                  <Banknote className="w-3.5 h-3.5" />
                  {isSw ? 'Mshahara wa msingi' : 'Base salary'}
                </h3>
                <p className="text-lg font-black font-mono text-emerald-700">{formatTSh(baseSalary)}</p>
              </section>
            )}

            <section>
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  draft.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {draft.active ? (isSw ? 'Anafanya kazi' : 'Active') : isSw ? 'Amesimamishwa' : 'Suspended'}
              </span>
            </section>
          </div>

          {canEdit && (
            <footer className="px-5 py-4 border-t border-[#EDEBE9] flex gap-2 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-[#E1DFDD] text-sm font-bold cursor-pointer"
              >
                {isSw ? 'Funga' : 'Close'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="flex-1 py-2.5 rounded-lg bg-[#107C10] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSw ? 'Hifadhi' : 'Save'}
              </button>
            </footer>
          )}
        </aside>
      </div>
    </ModalPortal>
  );
};

function Badge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-[#F3F2F1] text-[#323130] text-[10px] font-semibold border border-[#EDEBE9]">
      {label}
    </span>
  );
}
