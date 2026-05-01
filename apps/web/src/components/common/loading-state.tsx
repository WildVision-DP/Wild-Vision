import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
    label?: string;
    variant?: 'spinner' | 'table' | 'cards';
    className?: string;
}

export function LoadingState({ label = 'Loading data', variant = 'spinner', className }: LoadingStateProps) {
    if (variant === 'table') {
        return (
            <div className={cn('space-y-3 rounded-lg border bg-card p-4', className)}>
                <Skeleton className="h-9 w-48" />
                {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    if (variant === 'cards') {
        return (
            <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-lg border bg-card p-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-4 h-8 w-20" />
                        <Skeleton className="mt-3 h-3 w-32" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={cn('flex min-h-40 items-center justify-center rounded-lg border bg-card p-8 text-sm text-muted-foreground', className)}>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {label}
        </div>
    );
}
