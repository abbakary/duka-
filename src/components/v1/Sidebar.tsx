import React from 'react';
import { LogOut, Wifi, WifiOff, X } from 'lucide-react';
import type { AuthUser, BusinessType, Language, UserRole } from '@/types/v1';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useTenantTheme } from '@/context/TenantThemeContext';
import { getWorkplace } from '@/lib/businessProfiles';
import {
  getVisibleModules,
  isModuleHubTab,
  moduleLabel,
  resolveTabModule,
  type AppModuleId,
} from '@/lib/appModules';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  activeTab: string;
  setActiveTab: (view: string) => void;
  language: Language;
  role?: UserRole;
  userRole?: UserRole;
  businessType: BusinessType;
  businessName?: string;
  lowStockCount?: number;
  overdueCreditCount?: number;
  isOnline?: boolean;
  currentUser?: AuthUser | null;
  staffRole?: string;
  branchLabel?: string;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  language,
  businessType,
  businessName = 'Duka+',
  lowStockCount = 0,
  overdueCreditCount = 0,
  isOnline = true,
  currentUser,
  staffRole,
  branchLabel,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}) => {
  const { theme } = useTenantTheme();
  const isSw = language === 'sw';
  const workplace = getWorkplace(businessType, language);
  const modules = getVisibleModules(currentUser, businessType);

  const navigateModule = (mod: (typeof modules)[number]) => {
    setActiveTab(mod.directTab ?? mod.hubTab);
    onMobileClose?.();
  };

  const isModuleActive = (mod: (typeof modules)[number]) => {
    if (mod.directTab && activeTab === mod.directTab) return true;
    if (isModuleHubTab(activeTab) && activeTab === mod.hubTab) return true;
    const resolved = resolveTabModule(activeTab, businessType);
    return resolved?.id === mod.id;
  };

  const moduleBadge = (id: AppModuleId): number | undefined => {
    if (id === 'stock' && lowStockCount > 0) return lowStockCount;
    if (id === 'sales' && overdueCreditCount > 0) return overdueCreditCount;
    return undefined;
  };

  const sidebarBg = theme.sidebarBg || '#1a2832';
  const secondaryLine =
    branchLabel?.trim() ||
    (isSw ? workplace.label_sw : workplace.label_en);
  const showSecondaryLine =
    Boolean(secondaryLine) &&
    secondaryLine.trim().toLowerCase() !== businessName.trim().toLowerCase();

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
          w-[min(17rem,88vw)] lg:w-[13.25rem] lg:min-w-[13.25rem] lg:max-w-[13.25rem]
          m-0 lg:my-2 lg:ml-2 lg:mr-0
          flex flex-col rounded-none lg:rounded-xl overflow-hidden
          border-0 lg:border lg:border-black/20
          shadow-xl lg:shadow-md select-none font-sans shrink-0
          transition-transform duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ backgroundColor: sidebarBg }}
        aria-label={isSw ? 'Menyu ya moduli' : 'Module menu'}
      >
        {/* Brand — full business / branch names (wrap, no ellipsis) */}
        <div className="px-3 pt-3 pb-2.5 border-b border-white/10 bg-black/10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <BrandLogo height={32} className="rounded-md brightness-110 shrink-0 self-start" />
              <div className="leading-snug space-y-1">
                <p
                  className="text-[13px] font-bold text-white break-words hyphens-auto"
                  title={businessName}
                >
                  {businessName}
                </p>
                {showSecondaryLine && (
                  <p
                    className="text-[11px] font-medium text-white/65 break-words hyphens-auto"
                    title={secondaryLine}
                  >
                    {secondaryLine}
                  </p>
                )}
              </div>
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
          {staffRole && (
            <p className="mt-2 px-0.5 text-[10px] font-bold uppercase tracking-wide text-white/45 break-words">
              {staffRole}
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
          <p className="px-1.5 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            {isSw ? 'Moduli' : 'Modules'}
          </p>
          <ul className="space-y-1">
            {modules.map(mod => {
              const active = isModuleActive(mod);
              const badge = moduleBadge(mod.id);
              const Icon = mod.icon;
              return (
                <li key={mod.id}>
                  <button
                    type="button"
                    onClick={() => navigateModule(mod)}
                    title={moduleLabel(mod, language)}
                    className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-[#323130] shadow-sm ring-1 ring-white/80'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        active ? 'bg-[#6264A7]/12 text-[#6264A7]' : 'bg-white/5 text-white/70 group-hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-[17px] w-[17px]" strokeWidth={2.25} />
                    </span>
                    <span className="flex-1 min-w-0 text-[13px] font-semibold leading-snug break-words">
                      {moduleLabel(mod, language)}
                    </span>
                    {badge != null && badge > 0 && (
                      <span
                        className={`shrink-0 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
                          active ? 'bg-rose-500 text-white' : 'bg-amber-400 text-[#1a2832]'
                        }`}
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-2 py-2.5 border-t border-white/10 bg-black/10 space-y-1.5">
          <div
            className={`flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold ${
              isOnline ? 'bg-emerald-500/12 text-emerald-200/95' : 'bg-amber-500/12 text-amber-200/95'
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5 shrink-0" /> : <WifiOff className="h-3.5 w-3.5 shrink-0" />}
            <span>{isOnline ? (isSw ? 'Mtandaoni' : 'Online') : (isSw ? 'Nje ya mtandao' : 'Offline')}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onMobileClose?.();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-2 text-xs font-bold text-rose-300/95 hover:text-rose-100 cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isSw ? 'Ondoka' : 'Sign out'}
          </button>
        </div>
      </aside>
    </>
  );
};
