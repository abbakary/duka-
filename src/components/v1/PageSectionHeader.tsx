import React from 'react';

interface PageSectionHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
}

/** Centered page title block used across vendor dashboards and modules. */
export const PageSectionHeader: React.FC<PageSectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  toolbar,
  className = '',
}) => (
  <div className={`bg-white rounded-xl border border-[#E1DFDD] shadow-xs overflow-hidden w-full ${className}`}>
    <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-[#EDEBE9] bg-gradient-to-r from-white via-[#FAF9F8] to-white text-center">
      {icon && (
        <div className="flex justify-center mb-1">
          <div className="p-1.5 rounded-lg bg-[#6264A7]/10 text-[#6264A7] inline-flex">{icon}</div>
        </div>
      )}
      <h2 className="text-base sm:text-lg md:text-xl font-black text-[#323130] tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[10px] sm:text-[11px] text-[#605E5C] mt-1 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
      {badge && <div className="mt-1.5 flex justify-center flex-wrap gap-1.5">{badge}</div>}
    </div>
    {toolbar && (
      <div className="px-2.5 py-2 sm:px-3 sm:py-2.5 flex flex-wrap lg:flex-nowrap justify-center gap-1.5 w-full max-w-4xl mx-auto">
        {toolbar}
      </div>
    )}
  </div>
);
