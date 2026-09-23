import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Language, StaffMember } from '@/types/v1';
import type { TimeOffRequest, TimeOffType } from '@/lib/hrStore';

interface HrTimeOffPanelProps {
  language: Language;
  staffList: StaffMember[];
  requests: TimeOffRequest[];
  onChange: (next: TimeOffRequest[]) => void;
}

export const HrTimeOffPanel: React.FC<HrTimeOffPanelProps> = ({
  language,
  staffList,
  requests,
  onChange,
}) => {
  const isSw = language === 'sw';
  const [draft, setDraft] = useState({
    staffId: staffList[0]?.id || '',
    type: 'paid' as TimeOffType,
    dateFrom: '',
    dateTo: '',
    reason: '',
  });

  const submit = () => {
    const staff = staffList.find(s => s.id === draft.staffId);
    if (!staff || !draft.dateFrom || !draft.dateTo) return;
    const from = new Date(draft.dateFrom);
    const to = new Date(draft.dateTo);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
    const row: TimeOffRequest = {
      id: `to-${Date.now()}`,
      staffId: staff.id,
      staffName: staff.name,
      type: draft.type,
      dateFrom: draft.dateFrom,
      dateTo: draft.dateTo,
      days,
      status: 'pending',
      reason: draft.reason,
    };
    onChange([row, ...requests]);
    setDraft(d => ({ ...d, dateFrom: '', dateTo: '', reason: '' }));
  };

  const setStatus = (id: string, status: TimeOffRequest['status']) => {
    onChange(requests.map(r => (r.id === id ? { ...r, status } : r)));
  };

  const typeLabel = (t: TimeOffType) =>
    t === 'paid' ? (isSw ? 'Likizo ya malipo' : 'Paid leave') : t === 'sick' ? (isSw ? 'Ugonjwa' : 'Sick leave') : isSw ? 'Bila malipo' : 'Unpaid';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d4e8dc] rounded-lg p-4 grid md:grid-cols-2 lg:grid-cols-5 gap-2">
        <select
          className="px-3 py-2 border border-[#d4e8dc] rounded-md text-sm"
          value={draft.staffId}
          onChange={e => setDraft(d => ({ ...d, staffId: e.target.value }))}
        >
          {staffList.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 border border-[#d4e8dc] rounded-md text-sm"
          value={draft.type}
          onChange={e => setDraft(d => ({ ...d, type: e.target.value as TimeOffType }))}
        >
          <option value="paid">{typeLabel('paid')}</option>
          <option value="sick">{typeLabel('sick')}</option>
          <option value="unpaid">{typeLabel('unpaid')}</option>
        </select>
        <input type="date" className="px-3 py-2 border border-[#d4e8dc] rounded-md text-sm" value={draft.dateFrom} onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))} />
        <input type="date" className="px-3 py-2 border border-[#d4e8dc] rounded-md text-sm" value={draft.dateTo} onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))} />
        <button type="button" onClick={submit} className="px-3 py-2 rounded-md bg-[#107C10] text-white text-sm font-bold cursor-pointer">
          {isSw ? 'Wasilisha' : 'Submit'}
        </button>
      </div>

      <div className="bg-white border border-[#d4e8dc] rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-[#e7f5ec] text-xs uppercase text-[#3d5c4a]">
            <tr>
              <th className="text-left px-4 py-2">{isSw ? 'Mfanyakazi' : 'Employee'}</th>
              <th className="text-left px-3 py-2">{isSw ? 'Aina' : 'Type'}</th>
              <th className="text-left px-3 py-2">{isSw ? 'Tarehe' : 'Dates'}</th>
              <th className="text-right px-3 py-2">{isSw ? 'Siku' : 'Days'}</th>
              <th className="text-left px-3 py-2">{isSw ? 'Hali' : 'Status'}</th>
              <th className="text-right px-4 py-2">{isSw ? 'Vitendo' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#5a7a68]">
                  {isSw ? 'Hakuna maombi ya likizo.' : 'No time off requests yet.'}
                </td>
              </tr>
            ) : (
              requests.map(r => (
                <tr key={r.id} className="border-t border-[#eef5f0]">
                  <td className="px-4 py-2 font-semibold">{r.staffName}</td>
                  <td className="px-3 py-2">{typeLabel(r.type)}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.dateFrom} → {r.dateTo}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{r.days}</td>
                  <td className="px-3 py-2 capitalize">{r.status}</td>
                  <td className="px-4 py-2 text-right">
                    {r.status === 'pending' && (
                      <div className="inline-flex gap-1">
                        <button type="button" onClick={() => setStatus(r.id, 'approved')} className="p-1.5 rounded bg-[#e7f5ec] text-[#107C10] cursor-pointer" title="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setStatus(r.id, 'refused')} className="p-1.5 rounded bg-rose-50 text-rose-700 cursor-pointer" title="Refuse">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
