import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Download,
    Eye,
    Filter,
    Loader,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AuditTimeline } from '@/components/review/AuditTimeline';
import { ConfidenceBadge, DataToolbar, EmptyState, LoadingState, MetricCard, StatusBadge } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { normalizeConfidence } from '@/utils/detections';
import { toast } from 'sonner';

interface Detection {
    id: string;
    detected_animal: string;
    detected_animal_scientific: string;
    detection_confidence: number;
    confirmation_status: 'pending_confirmation' | 'confirmed' | 'rejected';
    auto_approved?: boolean;
    camera_name: string;
    uploaded_at: string;
    thumbnail_path: string;
    file_path: string;
    division_name: string;
    range_name: string;
    beat_name: string;
    confirmed_at?: string;
    confirmed_by_name?: string;
    uploaded_by_name?: string;
    metadata?: any;
}

interface ReviewStats {
    overall: Array<{
        status: string;
        count: number;
        avg_confidence: number;
    }>;
    by_animal: Array<{
        animal: string;
        status: string;
        count: number;
        avg_confidence: number;
    }>;
}

interface AuditEntry {
    id: string;
    action: string;
    metadata: Record<string, any>;
    created_at: string;
    user_name: string;
    user_email?: string | null;
}

interface AuditUndoState {
    can_undo: boolean;
    latest_action: string | null;
    latest_at: string | null;
    window_hours: number;
}

interface VerificationStats {
    summary: {
        total_actions: number;
        approved: number;
        rejected: number;
        reassessed: number;
        corrected_species: number;
        correction_rate_percent: number;
        avg_review_minutes: number;
    };
    by_officer: Array<{
        officer_name: string;
        officer_email?: string | null;
        action_count: number;
        approved: number;
        rejected: number;
        reassessed: number;
        avg_review_minutes: number;
    }>;
}

function formatAction(action: string) {
    return action
        .replace(/^detection_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toCsv(rows: Array<Record<string, any>>) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value: any) => {
        const raw = value == null ? '' : String(value);
        return `"${raw.replace(/"/g, '""')}"`;
    };
    return [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
    ].join('\n');
}

function downloadCsv(filename: string, rows: Array<Record<string, any>>) {
    const csv = toCsv(rows);
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export default function AdminReviewPage() {
    const [detections, setDetections] = useState<Detection[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [verificationStats, setVerificationStats] = useState<VerificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [animalFilter, setAnimalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('pending_confirmation');
    const [confidenceMin, setConfidenceMin] = useState(0);
    const [confidenceMax, setConfidenceMax] = useState(90);
    const [sortBy, setSortBy] = useState<'uploaded_at' | 'detection_confidence'>('uploaded_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [limit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);

    const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editedAnimal, setEditedAnimal] = useState('');
    const [reviewNotes, setReviewNotes] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
    const [auditUndo, setAuditUndo] = useState<AuditUndoState | null>(null);
    const [auditLoading, setAuditLoading] = useState(false);
    const animalInputRef = useRef<HTMLInputElement>(null);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const progress = useMemo(() => {
        const overall = stats?.overall || [];
        const countFor = (status: string) => overall.find((item) => item.status === status)?.count || 0;
        const pending = countFor('pending_confirmation');
        const confirmed = countFor('confirmed');
        const rejected = countFor('rejected');
        const reviewed = confirmed + rejected;
        const totalReviewable = reviewed + pending;

        return {
            pending,
            reviewed,
            totalReviewable,
            percent: totalReviewable ? Math.round((reviewed / totalReviewable) * 100) : 0,
        };
    }, [stats]);

    useEffect(() => {
        void loadReviews();
        void loadStats();
    }, [animalFilter, statusFilter, confidenceMin, confidenceMax, sortBy, sortOrder, offset, limit]);

    useEffect(() => {
        if (!isModalOpen || !selectedDetection || isProcessing) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping =
                target?.tagName === 'INPUT' ||
                target?.tagName === 'TEXTAREA' ||
                target?.isContentEditable;

            if (event.key === 'Escape') {
                closeReviewPanel();
                return;
            }

            if (isTyping) return;

            const key = event.key.toLowerCase();
            if (key === 'a') {
                event.preventDefault();
                void handleApprove(selectedDetection);
            } else if (key === 'r') {
                event.preventDefault();
                void handleReject(selectedDetection);
            } else if (key === 'e') {
                event.preventDefault();
                animalInputRef.current?.focus();
                animalInputRef.current?.select();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, selectedDetection, isProcessing, editedAnimal, reviewNotes, rejectReason]);

    const loadReviews = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('accessToken');
            if (!token) {
                setError('Not authenticated');
                return;
            }

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                sort: sortBy,
                sort_order: sortOrder,
                animal_filter: animalFilter,
                status_filter: statusFilter || 'all',
                confidence_min: confidenceMin.toString(),
                confidence_max: confidenceMax.toString(),
            });

            const res = await fetch(`/api/admin/reviews?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to load reviews');

            const data = await res.json();
            setDetections(data.reviews || []);
            setTotal(data.total || 0);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/admin/stats/summary', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }

            const verificationRes = await fetch('/api/admin/stats/verification', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (verificationRes.ok) {
                const verificationData = await verificationRes.json();
                setVerificationStats(verificationData);
            }
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const loadAuditHistory = async (detectionId: string) => {
        try {
            setAuditLoading(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detectionId}/audit`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to load audit history');
            const data = await res.json();
            setAuditEntries(data.audit || []);
            setAuditUndo(data.undo || null);
        } catch (err) {
            console.error('Failed to load audit history:', err);
            setAuditEntries([]);
            setAuditUndo(null);
        } finally {
            setAuditLoading(false);
        }
    };

    const openReviewModal = (detection: Detection) => {
        setSelectedDetection(detection);
        setEditedAnimal(detection.detected_animal);
        setReviewNotes('');
        setRejectReason('');
        setAuditEntries([]);
        setAuditUndo(null);
        setIsModalOpen(true);
        void loadAuditHistory(detection.id);
    };

    const closeReviewPanel = () => {
        setIsModalOpen(false);
        setSelectedDetection(null);
        setReviewNotes('');
        setRejectReason('');
        setAuditEntries([]);
        setAuditUndo(null);
    };

    const resetAfterDecision = () => {
        setDetections((current) => current.filter((detection) => detection.id !== selectedDetection?.id));
        closeReviewPanel();
        void loadStats();
    };

    const handleApprove = async (detection: Detection) => {
        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/approve`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    animal: editedAnimal || detection.detected_animal,
                    notes: reviewNotes.trim(),
                }),
            });

            if (!res.ok) throw new Error('Failed to approve');
            toast.success('Detection approved');
            resetAfterDecision();
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve detection');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (detection: Detection) => {
        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/reject`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: rejectReason.trim() || 'Rejected during manual review',
                    notes: reviewNotes.trim(),
                }),
            });

            if (!res.ok) throw new Error('Failed to reject');
            toast.success('Detection rejected');
            resetAfterDecision();
        } catch (err: any) {
            toast.error(err.message || 'Failed to reject detection');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReassess = async (detection: Detection) => {
        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/reassess`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: reviewNotes.trim() }),
            });

            if (!res.ok) throw new Error('Failed to reassess');
            toast.success('Detection sent for reassessment');
            resetAfterDecision();
        } catch (err: any) {
            toast.error(err.message || 'Failed to reassess detection');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUndoLatest = async (detection: Detection) => {
        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/undo`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to undo latest review action');
            }

            await loadAuditHistory(detection.id);
            await loadReviews();
            await loadStats();
            toast.success('Latest verification action undone');
        } catch (err: any) {
            toast.error(err.message || 'Failed to undo latest review action');
        } finally {
            setIsProcessing(false);
        }
    };

    const exportSelectedAudit = () => {
        if (!selectedDetection || auditEntries.length === 0) return;
        downloadCsv(
            `detection-${selectedDetection.id}-audit.csv`,
            auditEntries.map((entry) => ({
                created_at: entry.created_at,
                action: formatAction(entry.action),
                officer: entry.user_name,
                previous_animal: entry.metadata?.previous_animal || '',
                animal: entry.metadata?.animal || '',
                previous_status: entry.metadata?.previous_status || '',
                new_status: entry.metadata?.new_status || '',
                reason: entry.metadata?.reason || '',
                notes: entry.metadata?.notes || '',
            }))
        );
    };

    const exportVerificationReport = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/admin/reports/verification?limit=1000', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to export verification report');
            const data = await res.json();
            downloadCsv(
                `verification-report-${new Date().toISOString().slice(0, 10)}.csv`,
                data.rows || []
            );
            toast.success('Verification report exported');
        } catch (err: any) {
            toast.error(err.message || 'Failed to export verification report');
        }
    };

    const getThumbnailUrl = (detection: Detection) => {
        return detection.thumbnail_path
            ? `/api/proxy/${detection.thumbnail_path}`
            : `/api/proxy/${detection.file_path.replace(/\.[^/.]+$/, '.jpg')}`;
    };

    const getDetectionBox = (detection: Detection) => {
        const candidate =
            detection.metadata?.ai_prediction?.bbox ||
            detection.metadata?.bbox ||
            detection.metadata?.detections?.[0]?.bbox;

        if (!candidate) return null;

        const box = Array.isArray(candidate)
            ? {
                x: candidate[0],
                y: candidate[1],
                width: candidate[2],
                height: candidate[3],
            }
            : candidate;

        const values = [box.x, box.y, box.width, box.height].map(Number);
        if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;

        const [x, y, width, height] = values;
        const normalized =
            values.every((value) => value <= 1)
                ? { x: x * 100, y: y * 100, width: width * 100, height: height * 100 }
                : values.every((value) => value <= 100)
                    ? { x, y, width, height }
                    : null;

        if (!normalized || normalized.width <= 0 || normalized.height <= 0) return null;
        return {
            x: Math.min(100, normalized.x),
            y: Math.min(100, normalized.y),
            width: Math.min(100 - normalized.x, normalized.width),
            height: Math.min(100 - normalized.y, normalized.height),
        };
    };

    const selectedDetectionBox = selectedDetection ? getDetectionBox(selectedDetection) : null;

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Verification"
                title="Admin Review Queue"
                description="Review low-confidence detections, correct species labels, and keep an auditable verification trail."
                badges={
                    <>
                        <StatusBadge status="pending_confirmation" label={`${progress.pending} pending`} />
                        <StatusBadge status="confirmed" label={`${progress.reviewed} reviewed`} />
                    </>
                }
                actions={
                    <Button variant="outline" onClick={exportVerificationReport} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export Report
                    </Button>
                }
            />

            <section className="workspace-band p-5 sm:p-6">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Queue operating state</p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Manual review pressure</h2>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                                    Low-confidence and officer-reviewed detections stay grouped here so verification can happen without interrupting upload intake.
                                </p>
                            </div>
                            <div className="rounded-lg border bg-card px-4 py-3 text-right">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
                                <p className="mt-1 text-3xl font-semibold text-primary tabular-nums">{progress.percent}%</p>
                            </div>
                        </div>

                        {stats && (
                            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {stats.overall.map((item) => (
                                    <MetricCard
                                        key={item.status}
                                        label={formatAction(item.status)}
                                        value={item.count}
                                        description={`${normalizeConfidence(item.avg_confidence)}% avg confidence`}
                                        icon={ClipboardCheck}
                                        tone={
                                            item.status === 'confirmed'
                                                ? 'success'
                                                : item.status === 'rejected'
                                                    ? 'danger'
                                                    : 'warning'
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card p-4">
                            <div className="mb-3 flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">Verification progress</div>
                                    <div className="text-xs text-muted-foreground">
                                        {progress.reviewed} reviewed of {progress.totalReviewable} detections
                                    </div>
                                </div>
                                <div className="text-xl font-semibold text-primary tabular-nums">{progress.percent}%</div>
                            </div>
                            <Progress value={progress.percent} className="h-2" />
                            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                <span>{progress.pending} pending</span>
                                <span>{progress.reviewed} done</span>
                            </div>
                        </div>

                        {verificationStats && (
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard label="Approved" value={verificationStats.summary.approved} icon={ShieldCheck} tone="success" />
                                <MetricCard label="Rejected" value={verificationStats.summary.rejected} icon={XCircle} tone="danger" />
                                <MetricCard label="Correction Rate" value={`${verificationStats.summary.correction_rate_percent}%`} icon={BarChart3} tone="info" />
                                <MetricCard label="Avg Time" value={verificationStats.summary.avg_review_minutes} description="min" icon={Clock} />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                    <DataToolbar
                        title="Review filters"
                        description="Narrow the queue by species, status, confidence, and sort order."
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="gap-2"
                    >
                        {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </Button>
                }
                filters={
                    <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="space-y-2">
                            <Label>Animal Type</Label>
                            <Input
                                placeholder="Filter by animal"
                                value={animalFilter}
                                onChange={(e) => {
                                    setAnimalFilter(e.target.value);
                                    setOffset(0);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={statusFilter || 'all'}
                                onValueChange={(value) => {
                                    setStatusFilter(value === 'all' ? '' : value);
                                    setOffset(0);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="pending_confirmation">Pending Review</SelectItem>
                                    <SelectItem value="confirmed">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Min Confidence</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="5"
                                value={confidenceMin}
                                onChange={(e) => {
                                    setConfidenceMin(parseFloat(e.target.value) || 0);
                                    setOffset(0);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Max Confidence</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="5"
                                value={confidenceMax}
                                onChange={(e) => {
                                    setConfidenceMax(parseFloat(e.target.value) || 100);
                                    setOffset(0);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sort By</Label>
                            <Select
                                value={sortBy}
                                onValueChange={(value) => {
                                    setSortBy(value as 'uploaded_at' | 'detection_confidence');
                                    setOffset(0);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="uploaded_at">Date</SelectItem>
                                    <SelectItem value="detection_confidence">Confidence</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                }
                    />

                    {error && (
                        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                            <div>
                                <p className="font-semibold text-red-900">Error</p>
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    <Card className="workspace-table-wrap">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-lg">Review Queue</CardTitle>
                        <p className="text-sm text-muted-foreground">{total} total detections</p>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <LoadingState variant="table" />
                    ) : detections.length === 0 ? (
                        <EmptyState
                            title="No detections found"
                            description="Try adjusting the active filters or confidence range."
                            icon={Filter}
                        />
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Detection</TableHead>
                                        <TableHead>Camera</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Confidence</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detections.map((detection) => (
                                        <TableRow key={detection.id}>
                                            <TableCell>
                                                <div className="flex min-w-64 items-center gap-3">
                                                    <img
                                                        src={getThumbnailUrl(detection)}
                                                        alt={detection.detected_animal}
                                                        className="h-14 w-14 rounded-md border object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-foreground">{detection.detected_animal}</p>
                                                        <p className="truncate text-xs italic text-muted-foreground">
                                                            {detection.detected_animal_scientific || 'Scientific name unavailable'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{detection.camera_name}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <p>{detection.beat_name || 'Beat not assigned'}</p>
                                                    <p className="text-xs text-muted-foreground">{detection.range_name || 'Range not assigned'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <ConfidenceBadge value={detection.detection_confidence} />
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={detection.confirmation_status} />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(detection.uploaded_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" onClick={() => openReviewModal(detection)} className="gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    Review
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t pt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages} (showing {detections.length} of {total})
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setOffset(Math.max(0, offset - limit))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setOffset(offset + limit)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card className="sticky top-24">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Inspector Brief</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border bg-muted/35 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current filter</p>
                                <p className="mt-2 text-sm font-medium">
                                    {statusFilter === 'pending_confirmation' ? 'Pending manual review' : statusFilter || 'All statuses'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Confidence range {confidenceMin}-{confidenceMax}%
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                    <span className="text-muted-foreground">Queue size</span>
                                    <span className="font-semibold tabular-nums">{total}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                    <span className="text-muted-foreground">Loaded page</span>
                                    <span className="font-semibold tabular-nums">{detections.length}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                    <span className="text-muted-foreground">Pending</span>
                                    <span className="font-semibold tabular-nums text-amber-600">{progress.pending}</span>
                                </div>
                            </div>
                            <Separator />
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                                BLIP predictions are classification results. Review the whole image and metadata when bounding boxes are unavailable.
                            </div>
                            <div className="text-xs leading-5 text-muted-foreground">
                                Keyboard shortcuts in the inspector: `A` approve, `R` reject, `E` edit species, `Esc` close.
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>

            <Sheet
                open={isModalOpen}
                onOpenChange={(open) => {
                    if (!open) closeReviewPanel();
                }}
            >
                <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-6xl">
                    {selectedDetection && (
                        <>
                            <SheetHeader className="border-b px-6 py-5">
                                <SheetTitle>Review Detection: {selectedDetection.detected_animal}</SheetTitle>
                                <SheetDescription>
                                    Inspect the image, confirm the species, and record the verification decision.
                                </SheetDescription>
                            </SheetHeader>

                            <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
                                <div className="space-y-4">
                                    <div className="relative overflow-hidden rounded-lg border bg-black">
                                        <img
                                            src={getThumbnailUrl(selectedDetection)}
                                            alt={selectedDetection.detected_animal}
                                            className="h-[34rem] w-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22400%22/%3E%3C/svg%3E';
                                            }}
                                        />
                                        {selectedDetectionBox && (
                                            <div
                                                className="absolute border-2 border-green-400 bg-green-400/10 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                                                style={{
                                                    left: `${selectedDetectionBox.x}%`,
                                                    top: `${selectedDetectionBox.y}%`,
                                                    width: `${selectedDetectionBox.width}%`,
                                                    height: `${selectedDetectionBox.height}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                    {!selectedDetectionBox && (
                                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                            Bounding box metadata is not available for this BLIP prediction. Treat the image as a classification review, not a detector-localization review.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">AI Prediction</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Animal</div>
                                                <div className="mt-1 text-xl font-semibold text-green-700">{selectedDetection.detected_animal}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confidence</div>
                                                <div className="mt-2">
                                                    <ConfidenceBadge value={selectedDetection.detection_confidence} />
                                                </div>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scientific Name</div>
                                                <div className="mt-1 text-sm italic">{selectedDetection.detected_animal_scientific || 'Unknown'}</div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">Review Decision</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Animal Name</Label>
                                                <Input
                                                    ref={animalInputRef}
                                                    value={editedAnimal}
                                                    onChange={(e) => setEditedAnimal(e.target.value)}
                                                    placeholder="Animal species"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Rejection Reason</Label>
                                                <Input
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    placeholder="Required only when rejecting"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Review Notes</Label>
                                                <Textarea
                                                    value={reviewNotes}
                                                    onChange={(e) => setReviewNotes(e.target.value)}
                                                    placeholder="Optional verification notes"
                                                />
                                            </div>
                                            <Separator />
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Camera</div>
                                                    <div className="mt-1">{selectedDetection.camera_name}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uploaded</div>
                                                    <div className="mt-1">{new Date(selectedDetection.uploaded_at).toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beat</div>
                                                    <div className="mt-1">{selectedDetection.beat_name || 'Not assigned'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Range</div>
                                                    <div className="mt-1">{selectedDetection.range_name || 'Not assigned'}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <AuditTimeline
                                        entries={auditEntries}
                                        loading={auditLoading}
                                        canUndo={Boolean(auditUndo?.can_undo)}
                                        onUndo={() => handleUndoLatest(selectedDetection)}
                                        onExport={exportSelectedAudit}
                                        exportDisabled={auditEntries.length === 0}
                                        processing={isProcessing}
                                        formatAction={formatAction}
                                    />
                                </div>
                            </div>

                            <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur sm:flex-row">
                                <Button variant="outline" onClick={closeReviewPanel} disabled={isProcessing} className="flex-1">
                                    Cancel
                                </Button>
                                <Button variant="outline" onClick={() => handleReassess(selectedDetection)} disabled={isProcessing} className="flex-1">
                                    {isProcessing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                    Reassess
                                </Button>
                                <Button variant="destructive" onClick={() => handleReject(selectedDetection)} disabled={isProcessing} className="flex-1">
                                    {isProcessing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                    Reject
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(selectedDetection)}
                                    disabled={isProcessing || !editedAnimal.trim()}
                                >
                                    {isProcessing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Approve
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
