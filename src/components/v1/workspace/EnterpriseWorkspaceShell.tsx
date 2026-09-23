import React from 'react';
import { LayoutGrid } from 'lucide-react';

export interface WorkspaceTopNavItem {
  id: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export interface WorkspaceRailItem {
  id: string;
  label: string;
  group?: string;
}

interface EnterpriseWorkspaceShellProps {
  moduleLabel: string;
  companyLine?: string;
  topNav: WorkspaceTopNavItem[];
  breadcrumbPrefix: string;
  breadcrumbCurrent: string;
  rail: WorkspaceRailItem[];
  activeRailId: string;
  onRailSelect: (id: string) => void;
  children: React.ReactNode;
  onBackToApp?: () => void;
}

/** In-page enterprise shell: sticky horizontal app bar + breadcrumb + side rail (not the main app sidebar). */
export const EnterpriseWorkspaceShell: React.FC<EnterpriseWorkspaceShellProps> = ({
  moduleLabel,
  companyLine,
  topNav,
  breadcrumbPrefix,
  breadcrumbCurrent,
  rail,
  activeRailId,
  onRailSelect,
  children,
  onBackToApp,
}) => {
  const groups: string[] = [];
  rail.forEach(r => {
    const g = r.group || '';
    if (g && !groups.includes(g)) groups.push(g);
  });

  const renderRailButtons = (group?: string) =>
    rail
      .filter(r => (group ? r.group === group : !r.group))
      .map(item => {
        const active = item.id === activeRailId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onRailSelect(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`block w-full text-left border-0 bg-transparent py-1.5 pl-3 pr-4 text-sm transition-colors cursor-pointer border-l-[3px] ${
              active
                ? 'border-l-[#714b67] bg-[#f1e9ef] text-[#714b67] font-medium'
                : 'border-l-transparent text-[#212529] hover:bg-[#f3f0f2]'
            }`}
          >
            {item.label}
          </button>
        );
      });

  return (
    <div className="rounded-xl overflow-hidden border border-[#dee2e6] bg-[#f4f5f7] text-[#212529] text-sm leading-relaxed tabular-nums">
      <header className="sticky top-0 z-10 flex h-11 items-center gap-5 overflow-x-auto whitespace-nowrap bg-[#714b67] px-4 text-white">
        <button
          type="button"
          onClick={onBackToApp}
          className="inline-flex shrink-0 items-center gap-2 border-0 bg-transparent p-0 text-white cursor-pointer"
          title={moduleLabel}
        >
          <LayoutGrid className="h-[18px] w-[18px]" aria-hidden />
          <span className="font-medium opacity-100">{moduleLabel}</span>
        </button>
        {topNav.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`shrink-0 border-0 bg-transparent py-3 text-sm cursor-pointer ${
              item.active ? 'opacity-100 shadow-[inset_0_-2px_0_#fff]' : 'opacity-85 hover:opacity-100'
            }`}
          >
            {item.label}
          </button>
        ))}
        {companyLine ? <span className="ml-auto shrink-0 text-xs opacity-90">{companyLine}</span> : null}
      </header>

      <div className="border-b border-[#dee2e6] bg-white px-4 py-2.5">
        <div className="text-[#6c757d] text-xs">
          {breadcrumbPrefix} / <b className="font-medium text-[#212529]">{breadcrumbCurrent}</b>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[210px_minmax(0,1fr)] max-w-[1320px] mx-auto">
        <nav
          className="self-start rounded-md border border-[#dee2e6] bg-white py-2 md:sticky md:top-[calc(2.75rem+1px)]"
          aria-label={moduleLabel}
        >
          {groups.length === 0 ? (
            renderRailButtons()
          ) : (
            groups.map(g => (
              <div key={g}>
                <h3 className="mx-4 mb-1 mt-2.5 text-xs font-medium text-[#6c757d] first:mt-1">{g}</h3>
                {renderRailButtons(g)}
              </div>
            ))
          )}
        </nav>

        <main className="min-w-0 rounded-md border border-[#dee2e6] bg-white">{children}</main>
      </div>
    </div>
  );
};
