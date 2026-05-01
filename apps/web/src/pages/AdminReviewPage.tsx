/**
 * Admin Review Dashboard Page
 * Shows pending animal detections requiring manual review for admin/forest officers
 * Features:
 * - Filter by status, animal type, confidence range
 * - Approve/Reject/Reassess detections
 * - Edit animal names
 * - View detection statistics
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    AlertCircle, CheckCircle, XCircle, Eye, Loader,
    ArrowUp, ArrowDown, Filter, ChevronLeft, ChevronRight,
    Download, RotateCcw, History
} from 'lucide-react';
import { normalizeConfidence } from '@/utils/detections';

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

export default function AdminReviewPage() {
    const [detections, setDetections] = useState<Detection[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [verificationStats, setVerificationStats] = useState<VerificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [animalFilter, setAnimalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('pending_confirmation');
    const [confidenceMin, setConfidenceMin] = useState(0);
    const [confidenceMax, setConfidenceMax] = useState(90);
    const [sortBy, setSortBy] = useState<'uploaded_at' | 'detection_confidence'>('uploaded_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // Pagination
    const [limit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    
    // Modal
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

    // Load reviews and stats
    useEffect(() => {
        loadReviews();
        loadStats();
    }, [animalFilter, statusFilter, confidenceMin, confidenceMax, sortBy, sortOrder, offset, limit]);

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
                confidence_max: confidenceMax.toString()
            });

            const res = await fetch(`/api/admin/reviews?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }

            const verificationRes = await fetch('/api/admin/stats/verification', {
                headers: { 'Authorization': `Bearer ${token}` }
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
                headers: { 'Authorization': `Bearer ${token}` }
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

    const handleApprove = async (detection: Detection) => {
        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    animal: editedAnimal || detection.detected_animal,
                    notes: reviewNotes.trim()
                })
            });

            if (!res.ok) throw new Error('Failed to approve');

            // Remove from list and reload
            setDetections(detections.filter(d => d.id !== detection.id));
            setIsModalOpen(false);
            setSelectedDetection(null);
            setReviewNotes('');
            setRejectReason('');
            setAuditEntries([]);
            setAuditUndo(null);
            loadStats();
        } catch (err: any) {
            alert(err.message);
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
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: rejectReason.trim() || 'Rejected during manual review',
                    notes: reviewNotes.trim()
                })
            });

            if (!res.ok) throw new Error('Failed to reject');

            setDetections(detections.filter(d => d.id !== detection.id));
            setIsModalOpen(false);
            setSelectedDetection(null);
            setReviewNotes('');
            setRejectReason('');
            setAuditEntries([]);
            setAuditUndo(null);
            loadStats();
        } catch (err: any) {
            alert(err.message);
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
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notes: reviewNotes.trim() })
            });

            if (!res.ok) throw new Error('Failed to reassess');

            setDetections(detections.filter(d => d.id !== detection.id));
            setIsModalOpen(false);
            setSelectedDetection(null);
            setReviewNotes('');
            setRejectReason('');
            setAuditEntries([]);
            setAuditUndo(null);
            loadStats();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getThumbnailUrl = (detection: Detection) => {
        return detection.thumbnail_path
            ? `/api/proxy/${detection.thumbnail_path}`
            : `/api/proxy/${detection.file_path.replace(/\.[^/.]+$/, '.jpg')}`;
    };

    const handleUndoLatest = async (detection: Detection) => {
        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/undo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to undo latest review action');
            }

            await loadAuditHistory(detection.id);
            await loadReviews();
            await loadStats();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const progress = useMemo(() => {
        const overall = stats?.overall || [];
        const countFor = (status: string) =>
            overall.find(item => item.status === status)?.count || 0;
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
        if (values.some(value => !Number.isFinite(value) || value < 0)) return null;

        const [x, y, width, height] = values;
        const normalized =
            values.every(value => value <= 1)
                ? { x: x * 100, y: y * 100, width: width * 100, height: height * 100 }
                : values.every(value => value <= 100)
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

    useEffect(() => {
        if (!isModalOpen || !selectedDetection || isProcessing) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping =
                target?.tagName === 'INPUT' ||
                target?.tagName === 'TEXTAREA' ||
                target?.isContentEditable;

            if (event.key === 'Escape') {
                setIsModalOpen(false);
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

    const selectedDetectionBox = selectedDetection ? getDetectionBox(selectedDetection) : null;

    const formatAction = (action: string) =>
        action
            .replace(/^detection_/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());

    const toCsv = (rows: Array<Record<string, any>>) => {
        if (!rows.length) return '';
        const headers = Object.keys(rows[0]);
        const escape = (value: any) => {
            const raw = value == null ? '' : String(value);
            return `"${raw.replace(/"/g, '""')}"`;
        };
        return [
            headers.join(','),
            ...rows.map(row => headers.map(header => escape(row[header])).join(','))
        ].join('\n');
    };

    const downloadCsv = (filename: string, rows: Array<Record<string, any>>) => {
        const csv = toCsv(rows);
        if (!csv) return;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportSelectedAudit = () => {
        if (!selectedDetection || auditEntries.length === 0) return;
        downloadCsv(
            `detection-${selectedDetection.id}-audit.csv`,
            auditEntries.map(entry => ({
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
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to export verification report');
            const data = await res.json();
            downloadCsv(
                `verification-report-${new Date().toISOString().slice(0, 10)}.csv`,
                data.rows || []
            );
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Review Dashboard</h1>
                    <p className="text-gray-600 mt-2">Review low-confidence animal detections and approve/reject entries</p>
                </div>
                <Button variant="outline" onClick={exportVerificationReport} className="gap-2">
                    <Download className="w-4 h-4" />
                    Export Report
                </Button>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.overall.map((item) => (
                        <Card key={item.status}>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{item.count}</div>
                                    <div className="text-xs text-gray-600 mt-1 capitalize">{item.status.replace('_', ' ')}</div>
                                    <div className="text-xs text-gray-500 mt-1">{normalizeConfidence(item.avg_confidence)}% avg</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {stats && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div>
                                <div className="text-sm font-semibold text-gray-900">Verification Progress</div>
                                <div className="text-xs text-gray-600">
                                    {progress.reviewed} reviewed of {progress.totalReviewable} detections
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-green-700">{progress.percent}%</div>
                        </div>
                        <Progress value={progress.percent} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-600 mt-2">
                            <span>{progress.pending} pending</span>
                            <span>{progress.reviewed} confirmed/rejected</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {verificationStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-green-700">{verificationStats.summary.approved}</div>
                            <div className="text-xs text-gray-600 mt-1">Approved</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-red-700">{verificationStats.summary.rejected}</div>
                            <div className="text-xs text-gray-600 mt-1">Rejected</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-blue-700">{verificationStats.summary.correction_rate_percent}%</div>
                            <div className="text-xs text-gray-600 mt-1">Correction Rate</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-gray-800">{verificationStats.summary.avg_review_minutes}</div>
                            <div className="text-xs text-gray-600 mt-1">Avg Minutes</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" /> Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <Label>Animal Type</Label>
                            <Input
                                placeholder="Filter by animal..."
                                value={animalFilter}
                                onChange={(e) => {
                                    setAnimalFilter(e.target.value);
                                    setOffset(0);
                                }}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setOffset(0);
                                }}
                                className="w-full border rounded px-3 py-2 text-sm"
                            >
                                <option value="">All</option>
                                <option value="pending_confirmation">Pending Review</option>
                                <option value="confirmed">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
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
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value as any);
                                    setOffset(0);
                                }}
                                className="w-full border rounded px-3 py-2 text-sm"
                            >
                                <option value="uploaded_at">Date</option>
                                <option value="detection_confidence">Confidence</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 mr-2" /> : <ArrowDown className="w-4 h-4 mr-2" />}
                            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-900">Error</p>
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Detections List */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Reviews ({total} total)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    ) : detections.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No detections found matching filters
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {detections.map((detection) => (
                                <div
                                    key={detection.id}
                                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex gap-4">
                                        {/* Thumbnail */}
                                        <img
                                            src={getThumbnailUrl(detection)}
                                            alt={detection.detected_animal}
                                            className="w-20 h-20 object-cover rounded"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E';
                                            }}
                                        />

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{detection.detected_animal}</h3>
                                                    <p className="text-sm text-gray-600 italic">{detection.detected_animal_scientific}</p>
                                                    <div className="flex gap-2 mt-2 text-xs text-gray-500">
                                                        <span>{detection.camera_name}</span>
                                                        {detection.beat_name && <span>•</span>}
                                                        {detection.beat_name && <span>{detection.beat_name}</span>}
                                                    </div>
                                                </div>

                                                {/* Confidence Badge */}
                                                <div className="text-right">
                                                    <div className={`text-xl font-bold ${
                                                        normalizeConfidence(detection.detection_confidence) >= 80 ? 'text-green-600' :
                                                        normalizeConfidence(detection.detection_confidence) >= 60 ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                        {normalizeConfidence(detection.detection_confidence)}%
                                                    </div>
                                                    <div className="text-xs text-gray-600">Confidence</div>
                                                </div>
                                            </div>

                                            {/* Metadata and Actions */}
                                            <div className="flex items-center justify-between gap-2 mt-3">
                                                <div className="text-xs text-gray-600">
                                                    {new Date(detection.uploaded_at).toLocaleDateString()}
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openReviewModal(detection)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" /> Review
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                            <div className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages} (showing {detections.length} of {total})
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setOffset(Math.max(0, offset - limit))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setOffset(offset + limit)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Review Modal */}
            {isModalOpen && selectedDetection && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-6xl max-h-[92vh] overflow-y-auto">
                        <CardHeader className="sticky top-0 bg-white border-b flex items-center justify-between">
                            <CardTitle>Review Detection: {selectedDetection.detected_animal}</CardTitle>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                                <div className="space-y-3">
                                    <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                                        <img
                                            src={getThumbnailUrl(selectedDetection)}
                                            alt={selectedDetection.detected_animal}
                                            className="w-full h-[32rem] object-contain bg-black"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22400%22/%3E%3C/svg%3E';
                                            }}
                                        />
                                        {selectedDetectionBox && (
                                            <div
                                                className="absolute border-2 border-green-400 bg-green-400/10"
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
                                            Bounding box metadata is not available for this BLIP prediction.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">AI Prediction</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div>
                                                <div className="text-xs font-semibold text-gray-600">Animal</div>
                                                <div className="text-xl font-bold text-green-700">{selectedDetection.detected_animal}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-600">Scientific Name</div>
                                                <div className="text-sm italic">{selectedDetection.detected_animal_scientific || 'unknown'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-600">Confidence</div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {normalizeConfidence(selectedDetection.detection_confidence)}%
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
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
                                                <textarea
                                                    value={reviewNotes}
                                                    onChange={(e) => setReviewNotes(e.target.value)}
                                                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    placeholder="Optional verification notes"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-xs font-semibold text-gray-600">Camera</div>
                                                    <div>{selectedDetection.camera_name}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-gray-600">Uploaded</div>
                                                    <div>{new Date(selectedDetection.uploaded_at).toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-gray-600">Beat</div>
                                                    <div>{selectedDetection.beat_name || 'Not assigned'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-gray-600">Range</div>
                                                    <div>{selectedDetection.range_name || 'Not assigned'}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center justify-between gap-3">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <History className="w-4 h-4" />
                                                    Audit History
                                                </CardTitle>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={exportSelectedAudit}
                                                    disabled={auditEntries.length === 0}
                                                    className="gap-2"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    Export
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {auditUndo?.can_undo && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleUndoLatest(selectedDetection)}
                                                    disabled={isProcessing}
                                                    className="w-full gap-2"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    Undo latest verification
                                                </Button>
                                            )}

                                            {auditLoading ? (
                                                <div className="flex items-center justify-center py-6 text-sm text-gray-600">
                                                    <Loader className="w-4 h-4 animate-spin mr-2" />
                                                    Loading audit history
                                                </div>
                                            ) : auditEntries.length === 0 ? (
                                                <div className="text-sm text-gray-500">No audit entries recorded for this detection yet.</div>
                                            ) : (
                                                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                                                    {auditEntries.map(entry => (
                                                        <div key={entry.id} className="rounded-md border p-3 text-sm">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <div className="font-semibold text-gray-900">{formatAction(entry.action)}</div>
                                                                    <div className="text-xs text-gray-600">{entry.user_name}</div>
                                                                </div>
                                                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                                                    {new Date(entry.created_at).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-700">
                                                                {entry.metadata?.previous_animal && (
                                                                    <div>From: {entry.metadata.previous_animal}</div>
                                                                )}
                                                                {entry.metadata?.animal && (
                                                                    <div>To: {entry.metadata.animal}</div>
                                                                )}
                                                                {entry.metadata?.previous_status && (
                                                                    <div>Status: {entry.metadata.previous_status}</div>
                                                                )}
                                                                {entry.metadata?.new_status && (
                                                                    <div>New: {entry.metadata.new_status}</div>
                                                                )}
                                                            </div>
                                                            {(entry.metadata?.reason || entry.metadata?.notes) && (
                                                                <div className="mt-2 text-xs text-gray-600">
                                                                    {entry.metadata.reason && <div>Reason: {entry.metadata.reason}</div>}
                                                                    {entry.metadata.notes && <div>Notes: {entry.metadata.notes}</div>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 pt-4 mt-6 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleReassess(selectedDetection)}
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    {isProcessing && <Loader className="w-4 h-4 animate-spin mr-2" />}
                                    Reassess
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleReject(selectedDetection)}
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    {isProcessing ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                    Reject
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(selectedDetection)}
                                    disabled={isProcessing || !editedAnimal.trim()}
                                >
                                    {isProcessing ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    Approve
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
