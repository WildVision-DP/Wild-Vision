import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePageChromeSetter } from './page-chrome';

interface PageHeaderProps {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: ReactNode;
    badges?: ReactNode;
    className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, badges, className }: PageHeaderProps) {
    const setPageChrome = usePageChromeSetter();

    useEffect(() => {
        if (!setPageChrome) return;

        setPageChrome({ title, description, eyebrow, actions, badges });
    }, [setPageChrome, title, description, eyebrow]);

    if (setPageChrome) {
        return null;
    }

    return (
        <div className={cn('flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="min-w-0 space-y-2">
                {eyebrow && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {eyebrow}
                    </p>
                )}
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {title}
                    </h1>
                    {description && (
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
                {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
