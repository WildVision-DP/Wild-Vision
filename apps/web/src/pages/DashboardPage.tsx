import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    BarChart3,
    Camera,
    CheckCircle2,
    ClipboardCheck,
    Grid3X3,
    MapPin,
    RefreshCw,
    ShieldAlert,
    Wrench,
} from 'lucide-react';
import AdvancedDashboard from '@/components/AdvancedDashboard';
import CameraGallery from '@/components/CameraGallery';
import MapComponent from '@/components/MapComponent';
import { ConfidenceBadge, DataToolbar, EmptyState, LoadingState, MetricCard, StatusBadge } from '@/components/common';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    getDetectionReviewLabel,
    getDetectionReviewStatus,
    isAutoApprovedDetection,
    normalizeConfidence,
} from '@/utils/detections';

export default function DashboardPage() {
    const [cameraStats, setCameraStats] = useState({ active: 0, inactive: 0, maintenance: 0, total: 0 });
    const [geographyStats, setGeographyStats] = useState({ divisions: 0, ranges: 0, beats: 0 });
    const [cameras, setCameras] = useState<any[]>([]);
    const [confirmedDetections, setConfirmedDetections] = useState<any[]>([]);
    const [detectionStats, setDetectionStats] = useState({
        autoApproved: 0,
        manualApproved: 0,
        pendingReview: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewGalleryId, setViewGalleryId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'overview' | 'advanced'>('overview');

    const [animalFilter, setAnimalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [confidenceMin, setConfidenceMin] = useState(0);
    const [confidenceMax, setConfidenceMax] = useState(100);
    const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'confidence_high' | 'name_asc'>('latest');

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    useEffect(() => {
        void fetchDashboardData();

        const handleOpenGallery = (event: any) => {
            if (event.detail) setViewGalleryId(event.detail);
        };

        window.addEventListener('open-camera-gallery', handleOpenGallery);
        return () => window.removeEventListener('open-camera-gallery', handleOpenGallery);
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('accessToken');
            if (!token) {
                window.location.href = '/';
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            const [camerasRes, divisionsRes, rangesRes, beatsRes, detectionsRes] = await Promise.all([
                fetch('/api/cameras', { headers }),
                fetch('/api/geography/divisions', { headers }),
                fetch('/api/geography/ranges', { headers }),
                fetch('/api/geography/beats', { headers }),
                fetch('/api/images?confirmation_status=confirmed&limit=10&sort=confirmed_at', { headers }),
            ]);

            if (!camerasRes.ok && camerasRes.status === 401) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            if (camerasRes.ok) {
                const data = await camerasRes.json();
                const cameraList = data.cameras || [];
                setCameras(cameraList);
                setCameraStats({
                    total: cameraList.length,
                    active: cameraList.filter((camera: any) => camera.status === 'active').length,
                    inactive: cameraList.filter((camera: any) => camera.status === 'inactive').length,
                    maintenance: cameraList.filter((camera: any) => camera.status === 'maintenance').length,
                });
            }

            if (divisionsRes.ok && rangesRes.ok && beatsRes.ok) {
                const [divData, rangeData, beatData] = await Promise.all([
                    divisionsRes.json(),
                    rangesRes.json(),
                    beatsRes.json(),
                ]);
                setGeographyStats({
                    divisions: (divData.divisions || []).length,
                    ranges: (rangeData.ranges || []).length,
                    beats: (beatData.beats || []).length,
                });
            }

            if (detectionsRes.ok) {
                const detectionsData = await detectionsRes.json();
                const detections = Array.isArray(detectionsData) ? detectionsData : detectionsData.images || [];
                setConfirmedDetections(detections);
                setDetectionStats({
                    autoApproved: detections.filter((detection: any) => isAutoApprovedDetection(detection)).length,
                    manualApproved: detections.filter((detection: any) => getDetectionReviewStatus(detection) === 'manual_confirmed').length,
                    pendingReview: detections.filter((detection: any) => getDetectionReviewStatus(detection) === 'pending_confirmation').length,
                });
            } else {
                setConfirmedDetections([]);
                setDetectionStats({ autoApproved: 0, manualApproved: 0, pendingReview: 0 });
            }
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                setError('Unable to connect to server. Please ensure the API server is running.');
            } else {
                setError('Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredDetections = useMemo(() => {
        return confirmedDetections
            .filter((detection) => {
                if (animalFilter && !String(detection.detected_animal || '').toLowerCase().includes(animalFilter.toLowerCase())) return false;
                if (statusFilter !== 'all' && getDetectionReviewStatus(detection) !== statusFilter) return false;
                const confidence = normalizeConfidence(detection.detection_confidence);
                return confidence >= confidenceMin && confidence <= confidenceMax;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'latest':
                        return new Date(b.confirmed_at || b.uploaded_at || 0).getTime() - new Date(a.confirmed_at || a.uploaded_at || 0).getTime();
                    case 'oldest':
                        return new Date(a.confirmed_at || a.uploaded_at || 0).getTime() - new Date(b.confirmed_at || b.uploaded_at || 0).getTime();
                    case 'confidence_high':
                        return normalizeConfidence(b.detection_confidence) - normalizeConfidence(a.detection_confidence);
                    case 'name_asc':
                        return String(a.detected_animal || '').localeCompare(String(b.detected_animal || ''));
                    default:
                        return 0;
                }
            });
    }, [animalFilter, confidenceMax, confidenceMin, confirmedDetections, sortBy, statusFilter]);

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Overview" description="Loading current camera network and detection activity." />
                <LoadingState variant="cards" />
                <LoadingState variant="table" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <PageHeader title="Overview" description="The dashboard could not load the latest operating state." />
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                        <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                        <Button
                            onClick={() => void fetchDashboardData()}
                            className="mt-3 gap-2 bg-red-600 hover:bg-red-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Operations"
                title="Overview"
                description={`Welcome back, ${user.fullName || 'Officer'}. Monitor camera health, coverage, and recent verified detections.`}
                actions={
                    <div className="flex rounded-lg border bg-muted p-1">
                        <Button
                            variant={viewMode === 'overview' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('overview')}
                            className="gap-2"
                        >
                            <Grid3X3 className="h-4 w-4" />
                            Overview
                        </Button>
                        <Button
                            variant={viewMode === 'advanced' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('advanced')}
                            className="gap-2"
                        >
                            <BarChart3 className="h-4 w-4" />
                            Advanced
                        </Button>
                    </div>
                }
            />

            {viewMode === 'advanced' ? (
                <AdvancedDashboard />
            ) : (
                <>
                    <section className="workspace-band overflow-hidden">
                        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Operational command view</p>
                                        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Network health and verification pressure</h2>
                                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                                            Welcome back, {user.fullName || 'Officer'}. This workspace highlights live camera state, field coverage, and detections that need attention.
                                        </p>
                                    </div>
                                    <StatusBadge status={cameraStats.inactive > 0 ? 'warning' : 'active'} label={cameraStats.inactive > 0 ? `${cameraStats.inactive} offline` : 'Network nominal'} />
                                </div>
                                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <MetricCard label="Total Cameras" value={cameraStats.total} icon={Camera} description="Registered units" />
                                    <MetricCard label="Active" value={cameraStats.active} icon={CheckCircle2} tone="success" description="Recording units" />
                                    <MetricCard label="Offline" value={cameraStats.inactive} icon={ShieldAlert} tone="danger" description="Needs attention" />
                                    <MetricCard label="Maintenance" value={cameraStats.maintenance} icon={Wrench} tone="warning" description="Under repair" />
                                </div>
                            </div>
                            <div className="border-t bg-muted/25 p-5 sm:p-6 xl:border-l xl:border-t-0">
                                <p className="text-sm font-semibold">Coverage summary</p>
                                <div className="mt-4 grid grid-cols-3 gap-3">
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Divisions</p>
                                        <p className="mt-1 text-2xl font-semibold tabular-nums">{geographyStats.divisions}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Ranges</p>
                                        <p className="mt-1 text-2xl font-semibold tabular-nums">{geographyStats.ranges}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Beats</p>
                                        <p className="mt-1 text-2xl font-semibold tabular-nums">{geographyStats.beats}</p>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2 rounded-lg border bg-card p-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Auto approved</span>
                                        <span className="font-semibold tabular-nums">{detectionStats.autoApproved}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Manual approved</span>
                                        <span className="font-semibold tabular-nums">{detectionStats.manualApproved}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Pending review</span>
                                        <span className="font-semibold tabular-nums text-amber-600">{detectionStats.pendingReview}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
                        <div className="space-y-4">
                            <DataToolbar
                                title="Recent verified detections"
                                description="Latest confirmed image detections from the camera network."
                                filters={
                                    <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-5">
                                        <Input
                                            placeholder="Filter by animal"
                                            value={animalFilter}
                                            onChange={(event) => setAnimalFilter(event.target.value)}
                                        />
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="auto_approved">Auto Approved</SelectItem>
                                                <SelectItem value="manual_confirmed">Manual Approved</SelectItem>
                                                <SelectItem value="pending_confirmation">Pending Review</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={confidenceMin}
                                            onChange={(event) => setConfidenceMin(parseInt(event.target.value, 10) || 0)}
                                            aria-label="Minimum confidence"
                                        />
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={confidenceMax}
                                            onChange={(event) => setConfidenceMax(parseInt(event.target.value, 10) || 100)}
                                            aria-label="Maximum confidence"
                                        />
                                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sort" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="latest">Latest First</SelectItem>
                                                <SelectItem value="oldest">Oldest First</SelectItem>
                                                <SelectItem value="confidence_high">Confidence High to Low</SelectItem>
                                                <SelectItem value="name_asc">Animal Name A-Z</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                }
                            />

                            <Card className="workspace-table-wrap">
                                <CardContent className="p-0">
                                    {filteredDetections.length === 0 ? (
                                        <EmptyState
                                            title="No detections match the current filters"
                                            description="Recent verified detections will appear here as uploads are reviewed."
                                            icon={AlertCircle}
                                            className="m-6"
                                        />
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Animal</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Confidence</TableHead>
                                                    <TableHead>Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredDetections.map((detection) => (
                                                    <TableRow key={detection.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted">
                                                                    {detection.thumbnail_path ? (
                                                                        <img
                                                                            src={`/api/proxy/${detection.thumbnail_path}`}
                                                                            alt={detection.detected_animal}
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    ) : null}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">{detection.detected_animal || 'Unknown animal'}</p>
                                                                    <p className="text-xs italic text-muted-foreground">{detection.detected_animal_scientific || 'Scientific name unavailable'}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                <p>{detection.beat_name || 'Beat not assigned'}</p>
                                                                <p className="text-xs text-muted-foreground">{detection.camera_name || 'Camera not assigned'}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={getDetectionReviewStatus(detection)} label={getDetectionReviewLabel(detection)} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <ConfidenceBadge value={detection.detection_confidence} />
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {new Date(detection.confirmed_at || detection.uploaded_at || Date.now()).toLocaleDateString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="workspace-map-frame">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    Camera Network Map
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[min(58vh,560px)] min-h-[420px] overflow-hidden rounded-lg border">
                                    <MapComponent cameras={cameras} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <CameraGallery
                        cameraId={viewGalleryId || ''}
                        cameraName={cameras.find((camera) => camera.id === viewGalleryId)?.camera_name || 'Camera'}
                        isOpen={Boolean(viewGalleryId)}
                        onClose={() => setViewGalleryId(null)}
                    />
                </>
            )}
        </div>
    );
}
