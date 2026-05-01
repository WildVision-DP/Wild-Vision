import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    label: string;
    value: ReactNode;
    description?: ReactNode;
    trend?: ReactNode;
    icon?: LucideIcon;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    className?: string;
}

const toneClasses = {
    default: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200',
    info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200',
};

export function MetricCard({ label, value, description, trend, icon: Icon, tone = 'default', className }: MetricCardProps) {
    return (
        <Card className={cn('overflow-hidden', className)}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                            {value}
                        </div>
                    </div>
                    {Icon && (
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', toneClasses[tone])}>
                            <Icon className="h-5 w-5" />
                        </div>
                    )}
                </div>
                {(description || trend) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {description && <span>{description}</span>}
                        {trend && <span className="font-medium text-foreground">{trend}</span>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
