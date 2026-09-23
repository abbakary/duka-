import React, { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import type { Language } from '@/types/v1';
import type { RecruitmentApplicant, RecruitmentStage } from '@/lib/hrStore';

const STAGES: { id: RecruitmentStage; en: string; sw: string }[] = [
  { id: 'qualification', en: 'Initial qualification', sw: 'Sifa za awali' },
  { id: 'interview', en: 'Interview', sw: 'Mahojiano' },
  { id: 'contract', en: 'Contract proposal', sw: 'Pendekezo la mkataba' },
  { id: 'hired', en: 'Hired', sw: 'Ameajiriwa' },
];

interface HrRecruitmentKanbanProps {
  language: Language;
  applicants: RecruitmentApplicant[];
  onChange: (next: RecruitmentApplicant[]) => void;
  onHire?: (applicant: RecruitmentApplicant) => void;
}

export const HrRecruitmentKanban: React.FC<HrRecruitmentKanbanProps> = ({
  language,
  applicants,
  onChange,
  onHire,
}) => {
  const isSw = language === 'sw';
  const [form, setForm] = useState({ name: '', email: '', phone: '', jobTitle: 'Cashier' });

  const move = (id: string, stage: RecruitmentStage) => {
    const next = applicants.map(a => (a.id === id ? { ...a, stage } : a));
    onChange(next);
    if (stage === 'hired') {
      const hired = next.find(a => a.id === id);
      if (hired) onHire?.(hired);
    }
  };

  const addApplicant = () => {
    if (!form.name.trim()) return;
    const row: RecruitmentApplicant = {
      id: `app-${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      jobTitle: form.jobTitle,
      stage: 'qualification',
      rating: 3,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onChange([row, ...applicants]);
    setForm({ name: '', email: '', phone: '', jobTitle: 'Cashier' });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d4e8dc] rounded-lg p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <input
          className="px-3 py-2 border border-[#d4e8dc] rounded-md text-sm lg:col-span-2"
          placeholder={isSw ? 'Jina la mwombaji' : 'Applicant name'}
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          className="px-3 py-2 border border-[#d4e8dc] rounded-md text-sm"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
        <input
          className="px-3 py-2 border border-[#d4e8dc] rounded-md text-sm"
          placeholder={isSw ? 'Simu' : 'Phone'}
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
        />
        <button
          type="button"
          onClick={addApplicant}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-[#107C10] text-white text-sm font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isSw ? 'Ongeza' : 'Add'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => (
          <div key={stage.id} className="bg-[#f5faf7] border border-[#d4e8dc] rounded-lg min-w-[220px] flex flex-col max-h-[520px]">
            <div className="px-3 py-2 border-b border-[#d4e8dc] font-bold text-sm text-[#1a3d2e]">
              {isSw ? stage.sw : stage.en}
              <span className="ml-2 text-xs font-normal text-[#5a7a68]">
                ({applicants.filter(a => a.stage === stage.id).length})
              </span>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {applicants
                .filter(a => a.stage === stage.id)
                .map(a => (
                  <div key={a.id} className="bg-white border border-[#d4e8dc] rounded-md p-3 shadow-sm text-sm">
                    <p className="font-bold text-[#323130]">{a.name}</p>
                    <p className="text-xs text-[#5a7a68]">{a.jobTitle}</p>
                    <div className="flex items-center gap-0.5 mt-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < a.rating ? 'fill-current' : 'opacity-30'}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {STAGES.filter(s => s.id !== a.stage).slice(0, 2).map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => move(a.id, s.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-[#e7f5ec] text-[#107C10] cursor-pointer"
                        >
                          → {isSw ? s.sw.split(' ')[0] : s.en.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
