import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
    value: number | null | undefined;
    className?: string;
}

function normalize(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

export function ConfidenceBadge({ value, className }: ConfidenceBadgeProps) {
    const confidence = normalize(value);

    if (confidence === null) {
        return (
            <Badge variant="outline" className={cn('border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300', className)}>
                No confidence
            </Badge>
        );
    }

    const tone =
        confidence >= 80
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
            : confidence >= 50
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200';

    return (
        <Badge variant="outline" className={cn('font-medium tabular-nums', tone, className)}>
            {confidence}% confidence
        </Badge>
    );
}
