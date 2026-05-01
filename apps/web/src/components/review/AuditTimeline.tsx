import { Download, History, Loader, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common';
import { cn } from '@/lib/utils';

interface AuditTimelineEntry {
    id: string;
    action: string;
    metadata: Record<string, any>;
    created_at: string;
    user_name: string;
    user_email?: string | null;
}

interface AuditTimelineProps {
    entries: AuditTimelineEntry[];
    loading?: boolean;
    canUndo?: boolean;
    undoLabel?: string;
    onUndo?: () => void;
    onExport?: () => void;
    exportDisabled?: boolean;
    processing?: boolean;
    formatAction?: (action: string) => string;
    className?: string;
}

function defaultFormatAction(action: string) {
    return action
        .replace(/^detection_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function metadataRows(entry: AuditTimelineEntry) {
    return [
        ['From', entry.metadata?.previous_animal],
        ['To', entry.metadata?.animal],
        ['Previous status', entry.metadata?.previous_status],
        ['New status', entry.metadata?.new_status],
        ['Reason', entry.metadata?.reason],
        ['Notes', entry.metadata?.notes],
    ].filter(([, value]) => Boolean(value));
}

export function AuditTimeline({
    entries,
    loading = false,
    canUndo = false,
    undoLabel = 'Undo latest verification',
    onUndo,
    onExport,
    exportDisabled,
    processing = false,
    formatAction = defaultFormatAction,
    className,
}: AuditTimelineProps) {
    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <History className="h-4 w-4" />
                        Audit Timeline
                    </CardTitle>
                    {onExport && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onExport}
                            disabled={exportDisabled ?? entries.length === 0}
                            className="gap-2"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {canUndo && onUndo && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onUndo}
                        disabled={processing}
                        className="w-full gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        {undoLabel}
                    </Button>
                )}

                {loading ? (
                    <div className="flex items-center justify-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Loading audit history
                    </div>
                ) : entries.length === 0 ? (
                    <EmptyState
                        title="No audit entries yet"
                        description="Verification actions for this detection will appear here."
                        icon={History}
                        className="min-h-40"
                    />
                ) : (
                    <div className="max-h-80 space-y-0 overflow-y-auto pr-1">
                        {entries.map((entry, index) => {
                            const rows = metadataRows(entry);
                            const isLast = index === entries.length - 1;

                            return (
                                <div key={entry.id} className="relative flex gap-3 pb-5">
                                    <div className="flex flex-col items-center">
                                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                                        {!isLast && <span className="mt-2 w-px flex-1 bg-border" />}
                                    </div>
                                    <div className={cn('min-w-0 flex-1 rounded-lg border bg-background p-3', isLast && 'mb-0')}>
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground">{formatAction(entry.action)}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {entry.user_name}
                                                    {entry.user_email ? ` · ${entry.user_email}` : ''}
                                                </p>
                                            </div>
                                            <time className="shrink-0 text-xs text-muted-foreground">
                                                {new Date(entry.created_at).toLocaleString()}
                                            </time>
                                        </div>

                                        {rows.length > 0 && (
                                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                                {rows.map(([label, value]) => (
                                                    <div key={label} className="rounded-md bg-muted/60 px-2 py-1.5">
                                                        <span className="font-medium text-foreground">{label}: </span>
                                                        <span>{String(value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
