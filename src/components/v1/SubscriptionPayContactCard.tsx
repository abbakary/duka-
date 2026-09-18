import React from 'react';
import { MessageCircle, Phone, Smartphone } from 'lucide-react';
import {
  billingWhatsAppMessage,
  whatsappMeLink,
  type PlatformBillingSettings,
} from '@/lib/billingContact';

interface Props {
  settings: PlatformBillingSettings;
  isSw: boolean;
  businessName?: string;
  compact?: boolean;
  className?: string;
}

/** Shared Lipa number + WhatsApp support card for billing / upgrade / lock screens. */
export const SubscriptionPayContactCard: React.FC<Props> = ({
  settings,
  isSw,
  businessName,
  compact = false,
  className = '',
}) => {
  const wa = whatsappMeLink(
    settings.whatsappNumber,
    billingWhatsAppMessage(isSw, businessName),
  );
  const note = isSw ? settings.supportNoteSw : settings.supportNoteEn;

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      } ${className}`}
    >
      <div className="flex items-start gap-2">
        <Smartphone className={`text-emerald-700 shrink-0 ${compact ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5'}`} />
        <div className="min-w-0">
          <div className={`font-black uppercase tracking-wider text-emerald-800 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            {isSw ? 'Lipa namba (M-Pesa)' : 'Lipa number (M-Pesa)'}
          </div>
          <div className={`font-extrabold text-[#003322] tabular-nums ${compact ? 'text-base' : 'text-lg'}`}>
            {settings.lipaNumber}
            <span className="text-sm font-bold text-[#605E5C]"> — {settings.lipaName}</span>
          </div>
        </div>
      </div>

      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] hover:brightness-105 text-white font-bold shadow-sm cursor-pointer ${
          compact ? 'px-3 py-2 text-[11px]' : 'px-4 py-2.5 text-xs'
        }`}
      >
        <MessageCircle className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {isSw ? `Wasiliana WhatsApp · ${settings.whatsappNumber}` : `Contact WhatsApp · ${settings.whatsappNumber}`}
      </a>

      <p className={`text-[#605E5C] leading-snug flex items-start gap-1.5 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        <Phone className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-700" />
        <span>{note}</span>
      </p>
    </div>
  );
};
