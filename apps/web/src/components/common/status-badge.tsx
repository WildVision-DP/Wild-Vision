import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pending';

const toneClasses: Record<StatusTone, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    info: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200',
    neutral: 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-200',
    pending: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200',
};

const statusToneMap: Record<string, StatusTone> = {
    active: 'success',
    online: 'success',
    confirmed: 'success',
    approved: 'success',
    auto_approved: 'success',
    inactive: 'neutral',
    offline: 'danger',
    rejected: 'danger',
    critical: 'danger',
    maintenance: 'warning',
    warning: 'warning',
    pending: 'pending',
    pending_confirmation: 'pending',
    review: 'info',
    reassessed: 'info',
};

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
    status: string;
    label?: string;
    tone?: StatusTone;
    showDot?: boolean;
}

function formatStatus(status: string) {
    return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function StatusBadge({ status, label, tone, showDot = true, className, ...props }: StatusBadgeProps) {
    const resolvedTone = tone ?? statusToneMap[status.toLowerCase()] ?? 'neutral';

    return (
        <Badge variant="outline" className={cn('gap-1.5 font-medium', toneClasses[resolvedTone], className)} {...props}>
            {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
            {label ?? formatStatus(status)}
        </Badge>
    );
}
