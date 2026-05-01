import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ title, description, icon: Icon = SearchX, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center', className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
