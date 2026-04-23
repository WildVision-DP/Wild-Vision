/**
 * Admin Review Dashboard Page
 * Shows pending animal detections requiring manual review for admin/forest officers
 * Features:
 * - Filter by status, animal type, confidence range
 * - Approve/Reject/Reassess detections
 * - Edit animal names
 * - View detection statistics
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertCircle, CheckCircle, XCircle, RefreshCw, Eye, Loader,
    ArrowUp, ArrowDown, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Detection {
    id: string;
    detected_animal: string;
    detected_animal_scientific: string;
    detection_confidence: number;
    detection_status: 'pending_review' | 'auto_approved' | 'manual_approved' | 'rejected';
    camera_name: string;
    uploaded_at: string;
    thumbnail_path: string;
    file_path: string;
    division_name: string;
    range_name: string;
    beat_name: string;
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

export default function AdminReviewPage() {
    const [detections, setDetections] = useState<Detection[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [animalFilter, setAnimalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('pending_review');
    const [confidenceMin, setConfidenceMin] = useState(0);
    const [confidenceMax, setConfidenceMax] = useState(0.9);
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
    const [isProcessing, setIsProcessing] = useState(false);

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
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const handleApprove = async (detection: Detection) => {
        if (!window.confirm(`Approve detection: ${detection.detected_animal}?`)) return;

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
                    notes: ''
                })
            });

            if (!res.ok) throw new Error('Failed to approve');

            // Remove from list and reload
            setDetections(detections.filter(d => d.id !== detection.id));
            setIsModalOpen(false);
            setSelectedDetection(null);
            loadStats();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (detection: Detection) => {
        const reason = prompt('Rejection reason:');
        if (reason === null) return;

        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (!res.ok) throw new Error('Failed to reject');

            setDetections(detections.filter(d => d.id !== detection.id));
            setIsModalOpen(false);
            setSelectedDetection(null);
            loadStats();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReassess = async (detection: Detection) => {
        if (!window.confirm('Move back to pending review?')) return;

        try {
            setIsProcessing(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/admin/reviews/${detection.id}/reassess`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notes: '' })
            });

            if (!res.ok) throw new Error('Failed to reassess');

            setDetections(detections.filter(d => d.id !== detection.id));
            setIsModalOpen(false);
            setSelectedDetection(null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getThumbnailUrl = (detection: Detection) => {
        return detection.thumbnail_path
            ? `/api/image/${detection.thumbnail_path}`
            : `/api/image/${detection.file_path.replace(/\.[^/.]+$/, '.jpg')}`;
    };

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admin Review Dashboard</h1>
                <p className="text-gray-600 mt-2">Review low-confidence animal detections and approve/reject entries</p>
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
                                    <div className="text-xs text-gray-500 mt-1">{item.avg_confidence.toFixed(0)}% avg</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
                                <option value="pending_review">Pending Review</option>
                                <option value="manual_approved">Approved</option>
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
                                    setConfidenceMax(parseFloat(e.target.value) || 1);
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
                                                        detection.detection_confidence >= 80 ? 'text-green-600' :
                                                        detection.detection_confidence >= 60 ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>
                                                        {detection.detection_confidence.toFixed(0)}%
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
                                                        onClick={() => {
                                                            setSelectedDetection(detection);
                                                            setEditedAnimal(detection.detected_animal);
                                                            setIsModalOpen(true);
                                                        }}
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
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader className="sticky top-0 bg-white border-b flex items-center justify-between">
                            <CardTitle>Review Detection: {selectedDetection.detected_animal}</CardTitle>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {/* Large Image */}
                            <img
                                src={getThumbnailUrl(selectedDetection)}
                                alt={selectedDetection.detected_animal}
                                className="w-full h-96 object-cover rounded-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22400%22/%3E%3C/svg%3E';
                                }}
                            />

                            {/* Edit Animal */}
                            <div className="space-y-2">
                                <Label>Animal Name</Label>
                                <Input
                                    value={editedAnimal}
                                    onChange={(e) => setEditedAnimal(e.target.value)}
                                    placeholder="Animal species"
                                />
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-semibold text-gray-600">Scientific Name</div>
                                    <div className="text-sm italic">{selectedDetection.detected_animal_scientific}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-600">Confidence</div>
                                    <div className="text-lg font-bold text-blue-600">{selectedDetection.detection_confidence.toFixed(0)}%</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-600">Camera</div>
                                    <div className="text-sm">{selectedDetection.camera_name}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-600">Date</div>
                                    <div className="text-sm">{new Date(selectedDetection.uploaded_at).toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isProcessing}
                                    className="flex-1"
                                >
                                    Cancel
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
                                    disabled={isProcessing}
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
