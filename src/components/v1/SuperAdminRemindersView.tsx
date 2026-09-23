import React, { useState } from 'react';
import { Bell, MessageCircle, Send, Smartphone } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { Language, PlatformBroadcast, TenantStore } from '@/types/v1';
import { derivePaymentStatus, paymentStatusLabel } from '@/lib/saasPlans';
import { usePlatformBilling } from '@/context/PlatformBillingContext';
import { SubscriptionPayContactCard } from '@/components/v1/SubscriptionPayContactCard';
import { api } from '@/lib/api';
import { mapBroadcast } from '@/lib/apiSync';

type ReminderChannel = 'in_app' | 'sms' | 'whatsapp' | 'both';

interface Props {
  language: Language;
  broadcasts: PlatformBroadcast[];
  setBroadcasts: React.Dispatch<React.SetStateAction<PlatformBroadcast[]>>;
  tenants?: TenantStore[];
}

export const SuperAdminRemindersView: React.FC<Props> = ({
  language,
  broadcasts,
  setBroadcasts,
  tenants = [],
}) => {
  const isSw = language === 'sw';
  const { settings: billing } = usePlatformBilling();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<ReminderChannel>('both');
  const [target, setTarget] = useState<'all' | 'unpaid'>('unpaid');

  const unpaidTenants = tenants.filter(t => {
    const ps = derivePaymentStatus(t.subscriptionExpiry, t.status, billing.graceDays);
    return ps === 'unpaid' || ps === 'overdue' || ps === 'grace';
  });

  const sendReminder = async () => {
    if (!title.trim() || !message.trim()) return;
    try {
      const raw = await api.sendAdminBroadcast({
        title: title.trim(),
        message: message.trim(),
        channel: channel === 'whatsapp' ? 'sms' : channel,
        target,
      });
      setBroadcasts(prev => [mapBroadcast(raw as Record<string, unknown>), ...prev]);
    } catch {
      const audience = target === 'unpaid' ? unpaidTenants.length : tenants.length;
      setBroadcasts(prev => [{
        id: `br-${Date.now()}`,
        title: title.trim(),
        message: message.trim(),
        targetAudience: 'all',
        targetRegion: target === 'unpaid' ? `${audience} unpaid clients` : 'All clients',
        channel: channel === 'whatsapp' ? 'sms' : channel,
        sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        sentBy: 'Provider Admin',
        deliveryCount: audience,
        status: 'sent',
      }, ...prev]);
    }
    setTitle('');
    setMessage('');
  };

  const quickTemplate = (type: 'payment' | 'expiry') => {
    const lipa = `${billing.lipaNumber} (${billing.lipaName})`;
    const wa = billing.whatsappNumber;
    if (type === 'payment') {
      setTitle(isSw ? 'Kumbusho la malipo' : 'Payment reminder');
      setMessage(
        isSw
          ? `Habari! Usajili wako wa Duka+ unahitaji malipo. Lipia Lipa namba ${lipa}, kisha thibitisha WhatsApp ${wa} kwa jina la biashara + kumbukumbu ya M-Pesa.`
          : `Your Duka+ subscription needs payment. Pay Lipa number ${lipa}, then confirm on WhatsApp ${wa} with your business name + M-Pesa reference.`,
      );
    } else {
      setTitle(isSw ? 'Usajili unaisha' : 'Subscription expiring');
      setMessage(
        isSw
          ? `Usajili wako unaisha hivi karibuni. Lipia Lipa ${lipa} na wasiliana WhatsApp ${wa} ili kuepuka kusitishwa.`
          : `Your plan expires soon. Renew via Lipa ${lipa} and message WhatsApp ${wa} to avoid interruption.`,
      );
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
          {isSw ? 'VIKUMBUSHO' : 'REMINDERS'}
        </p>
        <h1 className="text-2xl font-serif font-bold text-[#003322]">
          {isSw ? 'Tuma vikumbusho kwa wateja' : 'Send client reminders'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {isSw ? 'WhatsApp, SMS, au arifa ndani ya programu.' : 'WhatsApp, SMS, or in-app notifications.'}
        </p>
      </header>

      <SubscriptionPayContactCard settings={billing} isSw={isSw} compact />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#D4AF37]" />
            {isSw ? 'Unda kikumbusho' : 'Compose reminder'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => quickTemplate('payment')} className="text-[11px] px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer">
              {isSw ? 'Kiolezo: malipo' : 'Template: payment'}
            </button>
            <button type="button" onClick={() => quickTemplate('expiry')} className="text-[11px] px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer">
              {isSw ? 'Kiolezo: kuisha' : 'Template: expiry'}
            </button>
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={isSw ? 'Kichwa' : 'Subject'} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder={isSw ? 'Ujumbe…' : 'Message…'} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-2">{isSw ? 'Njia' : 'Channel'}</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'in_app' as const, Icon: Smartphone, label: isSw ? 'Ndani ya app' : 'In-app' },
                  { id: 'sms' as const, Icon: MessageCircle, label: 'SMS' },
                  { id: 'whatsapp' as const, Icon: WhatsAppIcon, label: 'WhatsApp' },
                  { id: 'both' as const, Icon: Send, label: isSw ? 'Zote' : 'All' },
                ] as const
              ).map(({ id, Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                    channel === id ? 'bg-[#003322] text-white' : 'bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          <select value={target} onChange={e => setTarget(e.target.value as 'all' | 'unpaid')} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="unpaid">{isSw ? `Wateja wasiolipa (${unpaidTenants.length})` : `Unpaid clients (${unpaidTenants.length})`}</option>
            <option value="all">{isSw ? `Wote (${tenants.length})` : `All clients (${tenants.length})`}</option>
          </select>
          <button type="button" onClick={sendReminder} className="w-full py-2.5 rounded-xl font-bold text-sm text-[#003322] cursor-pointer" style={{ backgroundColor: '#D4AF37' }}>
            {isSw ? 'Tuma sasa' : 'Send now'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-sm mb-3">{isSw ? 'Historia ya vikumbusho' : 'Reminder history'}</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {broadcasts.map(b => (
              <div key={b.id} className="p-3 rounded-xl bg-[#F9F9F7] border border-slate-100 text-xs">
                <div className="font-bold text-[#003322]">{b.title}</div>
                <p className="text-slate-600 mt-1">{b.message}</p>
                <div className="text-[10px] text-slate-400 mt-2">{b.sentAt} · {b.deliveryCount} {isSw ? 'wateja' : 'recipients'}</div>
              </div>
            ))}
            {broadcasts.length === 0 && <p className="text-slate-500 text-sm">{isSw ? 'Hakuna bado.' : 'None yet.'}</p>}
          </div>
        </div>
      </div>

      {unpaidTenants.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-900">
            {unpaidTenants.length} {isSw ? 'wateja wanahitaji kikumbusho cha malipo' : 'clients need payment reminders'}
          </p>
          <ul className="mt-2 text-[11px] text-amber-800 space-y-1">
            {unpaidTenants.slice(0, 5).map(t => (
              <li key={t.id}>{t.name} — {paymentStatusLabel(derivePaymentStatus(t.subscriptionExpiry, t.status, billing.graceDays), isSw, billing.trialDays)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
