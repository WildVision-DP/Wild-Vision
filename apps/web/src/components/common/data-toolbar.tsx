import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataToolbarProps {
    title?: string;
    description?: string;
    filters?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function DataToolbar({ title, description, filters, actions, className }: DataToolbarProps) {
    return (
        <div className={cn('rounded-lg border bg-card p-4 shadow-sm', className)}>
            {(title || description || actions) && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        {title && <h2 className="text-base font-semibold text-card-foreground">{title}</h2>}
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}
            {filters && <div className={cn((title || description || actions) && 'mt-4', 'flex flex-wrap items-center gap-2')}>{filters}</div>}
        </div>
    );
}
