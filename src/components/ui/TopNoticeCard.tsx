import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToastPortal } from '@/components/ui/ModalPortal';

export type TopNoticeVariant = 'success' | 'warning' | 'error' | 'info';

export interface TopNoticePayload {
  variant: TopNoticeVariant;
  title: string;
  message?: string;
  /** Auto-hide after ms (default by variant). Set 0 to keep until dismissed. */
  durationMs?: number;
}

const variantStyles: Record<
  TopNoticeVariant,
  { shell: string; icon: typeof CheckCircle2; iconClass: string; bar: string }
> = {
  success: {
    shell: 'bg-white border-[#107C10]/35 shadow-[0_12px_40px_rgba(16,124,16,0.12)]',
    icon: CheckCircle2,
    iconClass: 'text-[#107C10]',
    bar: 'bg-[#107C10]',
  },
  warning: {
    shell: 'bg-white border-amber-300/80 shadow-[0_12px_40px_rgba(245,158,11,0.15)]',
    icon: AlertCircle,
    iconClass: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  error: {
    shell: 'bg-white border-rose-300/80 shadow-[0_12px_40px_rgba(225,29,72,0.12)]',
    icon: AlertCircle,
    iconClass: 'text-rose-600',
    bar: 'bg-rose-500',
  },
  info: {
    shell: 'bg-white border-[#0078D4]/30 shadow-[0_12px_40px_rgba(0,120,212,0.12)]',
    icon: Info,
    iconClass: 'text-[#0078D4]',
    bar: 'bg-[#0078D4]',
  },
};

const defaultDuration: Record<TopNoticeVariant, number> = {
  success: 6500,
  warning: 9000,
  error: 10000,
  info: 7000,
};

interface TopNoticeCardProps {
  notice: TopNoticePayload | null;
  onDismiss: () => void;
}

export function TopNoticeCard({ notice, onDismiss }: TopNoticeCardProps) {
  useEffect(() => {
    if (!notice) return;
    const ms = notice.durationMs ?? defaultDuration[notice.variant];
    if (ms <= 0) return;
    const t = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(t);
  }, [notice, onDismiss]);

  if (!notice) return null;

  const style = variantStyles[notice.variant];
  const Icon = style.icon;
  const showHint = Boolean(notice.message?.trim());

  return (
    <ToastPortal>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'w-[min(100vw-2rem,22rem)] rounded-2xl border overflow-hidden',
          'animate-in slide-in-from-right-4 fade-in duration-300',
          style.shell,
        )}
      >
        <div className={cn('h-1 w-full', style.bar)} />
        <div className="p-4 flex gap-3">
          <div
            className={cn(
              'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              notice.variant === 'success' && 'bg-[#107C10]/10',
              notice.variant === 'warning' && 'bg-amber-50',
              notice.variant === 'error' && 'bg-rose-50',
              notice.variant === 'info' && 'bg-[#0078D4]/10',
            )}
          >
            <Icon className={cn('w-5 h-5', style.iconClass)} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="font-bold text-sm text-[#323130] leading-snug">{notice.title}</div>
            {showHint && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#605E5C] flex gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{notice.message}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 p-1 rounded-lg text-[#605E5C] hover:bg-[#F3F2F1] hover:text-[#323130] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ToastPortal>
  );
}
