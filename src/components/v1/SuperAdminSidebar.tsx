import React from 'react';
import {
  ArrowLeft,
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import { Language } from '@/types/v1';
import { BrandLogo } from '@/components/ui/BrandLogo';

const FOREST = '#003322';
const GOLD = '#D4AF37';

interface SuperAdminSidebarProps {
  activeTab?: string;
  setActiveTab?: (view: string) => void;
  language: Language;
  onLogout: () => void;
  pendingApprovalsCount?: number;
  tenantsCount?: number;
  unpaidCount?: number;
  onSwitchToVendorMode?: () => void;
  onGoToLanding?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  activeTab = 'super-dashboard',
  setActiveTab,
  language = 'sw',
  onLogout,
  pendingApprovalsCount = 0,
  tenantsCount = 0,
  unpaidCount = 0,
  onSwitchToVendorMode,
  onGoToLanding,
  mobileOpen = false,
  onMobileClose,
}) => {
  const isSw = language === 'sw';
  const nav = (tab: string) => {
    setActiveTab?.(tab);
    onMobileClose?.();
  };

  const link = (
    tab: string,
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>,
    label: string,
    badge?: number | string,
  ) => {
    const active = activeTab === tab;
    return (
      <li>
        <button
          type="button"
          onClick={() => nav(tab)}
          title={label}
          className={`group w-full flex items-center gap-2 px-2 py-[0.45rem] rounded-lg text-left transition-all cursor-pointer ${
            active ? 'text-[#003322] shadow-sm ring-1 ring-[#D4AF37]/40' : 'text-white/85 hover:bg-white/8 hover:text-white'
          }`}
          style={active ? { backgroundColor: GOLD } : undefined}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
              active ? 'bg-[#003322]/10 text-[#003322]' : 'bg-white/5 text-white/65 group-hover:bg-white/10'
            }`}
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={2.25} />
          </span>
          <span className="flex-1 min-w-0 text-[11px] font-semibold leading-snug truncate">{label}</span>
          {badge != null && badge !== 0 && (
            <span
              className={`shrink-0 min-w-[1rem] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                active ? 'bg-[#003322] text-[#D4AF37]' : 'bg-[#D4AF37] text-[#003322]'
              }`}
            >
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>
      </li>
    );
  };

  const sectionLabel = (text: string) => (
    <li className="list-none pt-2 first:pt-0">
      <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: `${GOLD}cc` }}>
        {text}
      </p>
    </li>
  );

  return (
    <>
      <button
        type="button"
        aria-label={isSw ? 'Funga menyu' : 'Close menu'}
        onClick={onMobileClose}
        className={`fixed inset-0 z-[55] bg-black/45 border-0 cursor-pointer lg:hidden transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`
          fixed lg:relative z-[60] lg:z-30
          top-0 left-0
          h-dvh lg:h-[calc(100dvh-1rem)]
          w-[min(15.5rem,86vw)] lg:w-[11.75rem] lg:min-w-[11.75rem] lg:max-w-[11.75rem]
          m-0 lg:my-2 lg:ml-2 lg:mr-0
          flex flex-col rounded-none lg:rounded-xl overflow-hidden
          border-0 lg:border lg:border-black/20
          shadow-xl lg:shadow-md select-none font-sans shrink-0
          transition-transform duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ backgroundColor: FOREST }}
      >
        <div className="px-2.5 pt-2.5 pb-2 border-b border-white/10 bg-black/10">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BrandLogo height={28} className="rounded-md shrink-0" />
              <p className="text-[10px] uppercase tracking-wide font-bold truncate" style={{ color: GOLD }}>
                {isSw ? 'Mtoa Huduma' : 'Provider'}
              </p>
            </div>
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="lg:hidden p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                aria-label={isSw ? 'Funga menyu' : 'Close menu'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-white/6 border border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-white truncate">
                {isSw ? 'Usimamizi wa wateja' : 'Client management'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
          <ul className="space-y-0.5">
            {sectionLabel(isSw ? 'Wateja' : 'Clients')}
            {link('super-dashboard', LayoutDashboard, isSw ? 'Dashibodi' : 'Dashboard')}
            {link('super-tenants', Building2, isSw ? 'Wateja' : 'Clients', tenantsCount)}
            {link('super-approvals', ShieldCheck, isSw ? 'KYC' : 'KYC queue', pendingApprovalsCount)}

            {sectionLabel(isSw ? 'Malipo' : 'Billing')}
            {link('super-subscriptions', CreditCard, isSw ? 'Malipo' : 'Payments', unpaidCount || undefined)}
            {link('super-plans', Package, isSw ? 'Vifurushi' : 'Plans')}

            {sectionLabel(isSw ? 'Mawasiliano' : 'Outreach')}
            {link('super-reminders', Bell, isSw ? 'Vikumbusho' : 'Reminders')}
          </ul>
        </nav>

        <div className="px-1.5 py-2 border-t border-white/10 bg-black/10 space-y-1">
          {onGoToLanding && (
            <button
              type="button"
              onClick={() => {
                onMobileClose?.();
                onGoToLanding();
              }}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] text-white/70 hover:text-white cursor-pointer py-1 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-3 h-3 shrink-0" />
              <span className="truncate">{isSw ? 'Tovuti ya wateja' : 'Client site'}</span>
            </button>
          )}
          {onSwitchToVendorMode && (
            <button
              type="button"
              onClick={() => {
                onMobileClose?.();
                onSwitchToVendorMode();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/15 text-[10px] font-bold text-white/90 hover:bg-white/8 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
              <span className="truncate">{isSw ? 'Ona duka' : 'Shop preview'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onMobileClose?.();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-rose-300/95 hover:text-rose-100 cursor-pointer rounded-lg hover:bg-white/5"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" /> {isSw ? 'Ondoka' : 'Sign out'}
          </button>
        </div>
      </aside>
    </>
  );
};
