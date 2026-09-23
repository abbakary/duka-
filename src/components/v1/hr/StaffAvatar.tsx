import React from 'react';
import type { StaffMember } from '@/types/v1';

const ROLE_COLORS: Record<string, string> = {
  Owner: '#6264A7',
  Manager: '#0078D4',
  Cashier: '#107C10',
  Pharmacist: '#8764B8',
  Storekeeper: '#CA5010',
  Accountant: '#038387',
  HR: '#C239B3',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface StaffAvatarProps {
  staff: Pick<StaffMember, 'name' | 'role' | 'avatarUrl' | 'avatarColor'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export const StaffAvatar: React.FC<StaffAvatarProps> = ({ staff, size = 'md', className = '' }) => {
  const box = SIZES[size];
  const bg = staff.avatarColor || ROLE_COLORS[staff.role] || '#107C10';

  if (staff.avatarUrl && (staff.avatarUrl.startsWith('http') || staff.avatarUrl.startsWith('data:'))) {
    return (
      <img
        src={staff.avatarUrl}
        alt=""
        className={`${box} rounded-full object-cover border-2 border-[#EDEBE9] shrink-0 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${box} rounded-full flex items-center justify-center text-white font-bold shrink-0 border-2 border-white shadow-sm ${className}`}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {initials(staff.name)}
    </div>
  );
};
