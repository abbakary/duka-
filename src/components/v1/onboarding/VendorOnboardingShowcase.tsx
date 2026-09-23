import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Sparkles, X } from 'lucide-react';
import type { Language } from '@/types/v1';
import {
  ONBOARDING_SHOWCASE_CARDS,
  cardBody,
  cardOpenModuleLabel,
  cardOpenTab,
  cardSteps,
  cardTitle,
  markOnboardingComplete,
  type OnboardingShowcaseCard,
} from '@/lib/onboardingShowcaseCards';

interface Props {
  language: Language;
  tenantId: string;
  businessName?: string;
  onNavigate: (tab: string) => void;
  onDismiss: () => void;
}

function CardImage({ card }: { card: OnboardingShowcaseCard }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="h-full w-full flex items-center justify-center text-white text-xs font-bold px-4 text-center"
        style={{ background: `linear-gradient(135deg, ${card.accent}, #1a3d2e)` }}
      >
        {card.titleEn}
      </div>
    );
  }
  return (
    <img
      src={card.imageUrl}
      alt=""
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export const VendorOnboardingShowcase: React.FC<Props> = ({
  language,
  tenantId,
  businessName,
  onNavigate,
  onDismiss,
}) => {
  const isSw = language === 'sw';
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = ONBOARDING_SHOWCASE_CARDS.find(c => c.id === selectedId) ?? null;

  const finish = () => {
    markOnboardingComplete(tenantId);
    onDismiss();
  };

  const openModule = (tab: string) => {
    markOnboardingComplete(tenantId);
    onNavigate(tab);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#faf9f6] via-white to-[#eff6ff] rounded-2xl border border-[#d4e8dc] shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b border-[#e7f5ec] flex items-start justify-between gap-3 shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#107C10] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {isSw ? 'Karibu Duka+' : 'Welcome to Duka+'}
            </p>
            <h2 className="text-lg sm:text-xl font-black text-[#1a3d2e] mt-0.5">
              {selected
                ? cardTitle(selected, language)
                : isSw
                  ? 'Jinsi ya kutumia mfumo wako'
                  : 'How to use your shop system'}
            </h2>
            <p className="text-sm text-slate-700 mt-1 max-w-xl leading-relaxed">
              {selected
                ? cardBody(selected, language)
                : isSw
                  ? `Soma hatua kwa kila kadi kwanza, kisha fungua moduli. ${businessName || 'Duka lako'} lina data ya mfano kwenye seva.`
                  : `Read the steps on each card first, then open the module. ${businessName || 'Your shop'} has sample server data to practice with.`}
            </p>
          </div>
          <button type="button" onClick={finish} className="p-2 rounded-lg hover:bg-black/5 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5 text-[#5a7a68]" />
          </button>
        </header>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {selected ? (
            <div className="max-w-2xl mx-auto space-y-4">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#5a7a68] hover:text-[#1a3d2e] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {isSw ? 'Rudi kwenye kadi zote' : 'Back to all modules'}
              </button>

              <div className="rounded-xl overflow-hidden border border-[#d4e8dc] h-40 sm:h-48 relative">
                <CardImage card={selected} />
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: `linear-gradient(135deg, ${selected.accent}, transparent)` }}
                />
              </div>

              <div className="bg-white rounded-xl border border-[#d4e8dc] p-4 sm:p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-[#5a7a68] flex items-center gap-1.5 mb-3">
                  <BookOpen className="w-4 h-4" style={{ color: selected.accent }} />
                  {isSw ? 'Hatua kwa hatua' : 'Step-by-step'}
                </p>
                <ol className="space-y-3">
                  {cardSteps(selected, language).map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#323130] leading-snug">
                      <span
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ backgroundColor: selected.accent }}
                      >
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold text-[#5a7a68] border border-[#d4e8dc] bg-white cursor-pointer"
                >
                  {isSw ? 'Soma moduli nyingine' : 'Read another module'}
                </button>
                <button
                  type="button"
                  onClick={() => openModule(cardOpenTab(selected))}
                  className="px-5 py-2.5 rounded-lg text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:brightness-110"
                  style={{ backgroundColor: selected.accent }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {cardOpenModuleLabel(selected, language)}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ONBOARDING_SHOWCASE_CARDS.map(card => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedId(card.id)}
                  className="text-left rounded-xl border border-[#d4e8dc] bg-white overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                  <div className="h-32 sm:h-36 overflow-hidden relative group">
                    <CardImage card={card} />
                    <div
                      className="absolute inset-0 opacity-25 mix-blend-multiply"
                      style={{ background: `linear-gradient(135deg, ${card.accent}, transparent)` }}
                    />
                  </div>
                  <div className="p-3 space-y-2 bg-slate-50/80 border-t border-slate-100">
                    <p className="text-sm font-bold text-[#1a3d2e]">{cardTitle(card, language)}</p>
                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{cardBody(card, language)}</p>
                    <p className="text-xs text-slate-600 font-medium">
                      {isSw
                        ? `${card.stepsSw.length} hatua — bonyeza kusoma`
                        : `${card.stepsEn.length} steps — tap to read`}
                    </p>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: card.accent }}
                    >
                      {isSw ? 'Soma hatua' : 'View steps'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {!selected && (
          <footer className="px-5 py-3 border-t border-[#e7f5ec] flex flex-wrap gap-2 justify-between shrink-0 bg-white/80">
            <p className="text-xs text-slate-600 self-center max-w-md leading-relaxed">
              {isSw
                ? 'Usifungue moduli moja kwa moja — soma hatua kwanza ili kuepuka changamoto.'
                : 'Do not jump into modules blindly — read the steps on each card first.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={finish}
                className="px-4 py-2 rounded-lg text-xs font-bold text-[#5a7a68] hover:bg-[#f0fdf4] cursor-pointer"
              >
                {isSw ? 'Ruka — nitaangalia baadaye' : 'Skip for now'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedId('inventory')}
                className="px-5 py-2 rounded-lg bg-[#107C10] text-white text-xs font-bold cursor-pointer hover:bg-[#0e6a0e]"
              >
                {isSw ? 'Anza njia ya stoo (soma hatua)' : 'Start stock journey (read steps)'}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
