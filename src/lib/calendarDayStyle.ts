import type { CalendarEvent, CalendarEventCategory } from '@/types/v1';

const CATEGORY_TINT: Record<CalendarEventCategory | 'maintenance' | 'general', string> = {
  delivery: '#93c5fd',
  dunning: '#fca5a5',
  compliance: '#86efac',
  promo: '#fde047',
  shift: '#fef3c7',
  maintenance: '#64748b',
  general: '#e7e5e4',
};

/** Mixed gradient background for a calendar day cell from live event categories. */
export function dayCellBackground(dayEvents: CalendarEvent[]): string {
  if (dayEvents.length === 0) {
    return 'linear-gradient(145deg, #faf9f6 0%, #f0fdf4 55%, #eff6ff 100%)';
  }
  const order: (CalendarEventCategory | 'maintenance' | 'general')[] = [
    'compliance',
    'delivery',
    'promo',
    'shift',
    'dunning',
    'maintenance',
    'general',
  ];
  const present = order.filter(cat => dayEvents.some(e => (e.category as string) === cat));
  const colors = (present.length ? present : ['general']).map(c => CATEGORY_TINT[c]).slice(0, 4);
  if (colors.length === 1) {
    return `linear-gradient(160deg, ${colors[0]}55 0%, #ffffff 100%)`;
  }
  const stops = colors.map((c, i) => `${c}${i === 0 ? 'cc' : '99'} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ');
  return `linear-gradient(135deg, ${stops}, #faf9f6 100%)`;
}

export function formatMonthYear(d: Date, isSw: boolean): string {
  return d.toLocaleDateString(isSw ? 'sw-TZ' : 'en-TZ', { month: 'long', year: 'numeric' });
}

export function ymdFromParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayYmd(): string {
  const t = new Date();
  return ymdFromParts(t.getFullYear(), t.getMonth(), t.getDate());
}
