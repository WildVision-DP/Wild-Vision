import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, Layers, MapPin, PawPrint, RefreshCw, Video } from 'lucide-react';
import CameraGallery from '@/components/CameraGallery';
import MapComponent from '@/components/MapComponent';
import { ConfidenceBadge, EmptyState, LoadingState, MetricCard, StatusBadge } from '@/components/common';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { normalizeConfidence } from '@/utils/detections';
import { toast } from 'sonner';

type CameraRecord = {
    id: string;
    camera_id: string;
    camera_name: string;
    latitude: number;
    longitude: number;
    status: string;
    notes?: string;
    division_name?: string;
    range_name?: string;
    beat_name?: string;
};

type DetectionRecord = {
    id: string;
    detected_animal: string;
    detected_animal_scientific: string;
    detection_confidence: number;
    confirmed_at: string;
    camera_id: string;
    file_path: string;
    thumbnail_path: string;
    taken_at?: string;
};

export default function WildlifeMapPage() {
    const [cameras, setCameras] = useState<CameraRecord[]>([]);
    const [detections, setDetections] = useState<DetectionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewGalleryId, setViewGalleryId] = useState<string | null>(null);
    const [selectedCamera, setSelectedCamera] = useState<CameraRecord | null>(null);
    const [selectedDetection, setSelectedDetection] = useState<DetectionRecord | null>(null);

    useEffect(() => {
        void fetchMapData();

        const handleOpenGallery = (event: any) => {
            if (event.detail) setViewGalleryId(event.detail);
        };

        window.addEventListener('open-camera-gallery', handleOpenGallery);
        return () => window.removeEventListener('open-camera-gallery', handleOpenGallery);
    }, []);

    const stats = useMemo(() => ({
        total: cameras.length,
        active: cameras.filter((camera) => camera.status === 'active').length,
        maintenance: cameras.filter((camera) => camera.status === 'maintenance').length,
        inactive: cameras.filter((camera) => camera.status === 'inactive').length,
    }), [cameras]);

    const fetchMapData = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setError('No authentication token found');
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            const [camerasRes, detectionsRes] = await Promise.all([
                fetch('/api/cameras', { headers }),
                fetch('/api/images?confirmation_status=confirmed&limit=50&sort=confirmed_at', { headers }),
            ]);

            if (!camerasRes.ok) throw new Error('Failed to load camera network');
            const cameraData = await camerasRes.json();
            setCameras(cameraData.cameras || []);

            if (detectionsRes.ok) {
                const detectionData = await detectionsRes.json();
                setDetections(detectionData.images || []);
            } else {
                setDetections([]);
            }

            toast.success('Map data refreshed');
        } catch (error: any) {
            setError(error.message || 'Failed to load map data');
            toast.error(error.message || 'Failed to load map data');
        } finally {
            setLoading(false);
        }
    };

    const cameraForGallery = cameras.find((camera) => camera.id === viewGalleryId);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Map Workspace"
                title="Wildlife Activity Map"
                description="Inspect camera coverage, operational status, and recent confirmed detections in one map workspace."
                actions={
                    <Button variant="outline" size="sm" onClick={() => void fetchMapData()} disabled={loading} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                }
                badges={
                    <>
                        <StatusBadge status="active" label={`${stats.active} active`} />
                        <StatusBadge status="maintenance" label={`${stats.maintenance} maintenance`} />
                        <StatusBadge status="inactive" label={`${stats.inactive} offline`} />
                    </>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total Cameras" value={stats.total} icon={Camera} description="Mapped surveillance units" />
                <MetricCard label="Active Cameras" value={stats.active} icon={Video} tone="success" description="Available in field" />
                <MetricCard label="Offline Units" value={stats.inactive} icon={AlertCircle} tone="danger" description="Need follow-up" />
                <MetricCard label="Confirmed Detections" value={detections.length} icon={PawPrint} tone="info" description="Latest mapped records" />
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {loading ? (
                <LoadingState label="Loading map workspace" className="min-h-[560px]" />
            ) : (
                <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(0,1.7fr)_380px]">
                    <Card className="workspace-map-frame">
                        <div className="flex flex-col gap-3 border-b bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <MapPin className="h-4 w-4 text-primary" />
                                Camera Network
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>{cameras.length} cameras</span>
                                <span>{detections.length} confirmed detections</span>
                            </div>
                        </div>
                        <div className="h-[560px]">
                            <MapComponent cameras={cameras} />
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Layers className="h-4 w-4" />
                                    Map Legend
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <LegendRow color="bg-green-500" label="Active camera" />
                                <LegendRow color="bg-yellow-500" label="Maintenance camera" />
                                <LegendRow color="bg-red-500" label="Offline camera" />
                                <Separator />
                                <LegendRow color="bg-orange-600" label="Confirmed detection record" square />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Camera Detail</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedCamera ? (
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="font-semibold">{selectedCamera.camera_name}</p>
                                            <p className="font-mono text-xs text-muted-foreground">{selectedCamera.camera_id}</p>
                                        </div>
                                        <StatusBadge status={selectedCamera.status || 'inactive'} />
                                        <Separator />
                                        <DetailRow label="Division" value={selectedCamera.division_name || 'Unassigned'} />
                                        <DetailRow label="Range" value={selectedCamera.range_name || 'Unassigned'} />
                                        <DetailRow label="Beat" value={selectedCamera.beat_name || 'Unassigned'} />
                                        <DetailRow
                                            label="Coordinates"
                                            value={
                                                selectedCamera.latitude != null && selectedCamera.longitude != null
                                                    ? `${Number(selectedCamera.latitude).toFixed(5)}, ${Number(selectedCamera.longitude).toFixed(5)}`
                                                    : 'Not recorded'
                                            }
                                        />
                                        <Button size="sm" variant="outline" onClick={() => setViewGalleryId(selectedCamera.id)} className="w-full">
                                            Open Gallery
                                        </Button>
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="Select a camera"
                                        description="Choose a camera from the list below to inspect details."
                                        icon={Camera}
                                        className="min-h-40"
                                    />
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <PawPrint className="h-4 w-4 text-primary" />
                                    Recent Detections
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                    {detections.length > 0 ? detections.slice(0, 12).map((detection) => (
                                        <button
                                            key={detection.id}
                                            onClick={() => setSelectedDetection(detection)}
                                            className="w-full rounded-lg border bg-background p-3 text-left transition hover:bg-muted/50"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{detection.detected_animal}</p>
                                                    <p className="truncate text-xs italic text-muted-foreground">
                                                        {detection.detected_animal_scientific || 'Scientific name unavailable'}
                                                    </p>
                                                </div>
                                                <ConfidenceBadge value={normalizeConfidence(detection.detection_confidence)} />
                                            </div>
                                        </button>
                                    )) : (
                                        <EmptyState title="No confirmed detections" icon={PawPrint} className="min-h-36" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {selectedDetection && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Detection Detail</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <p className="font-semibold">{selectedDetection.detected_animal}</p>
                                    <ConfidenceBadge value={selectedDetection.detection_confidence} />
                                    <DetailRow label="Confirmed" value={selectedDetection.confirmed_at ? new Date(selectedDetection.confirmed_at).toLocaleString() : 'Not recorded'} />
                                    <DetailRow label="Camera" value={selectedDetection.camera_id || 'Unknown'} />
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Camera List</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                    {cameras.map((camera) => (
                                        <button
                                            key={camera.id}
                                            onClick={() => setSelectedCamera(camera)}
                                            className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition hover:bg-muted/50"
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium">{camera.camera_name}</span>
                                                <span className="block truncate text-xs text-muted-foreground">{camera.beat_name || camera.range_name || 'Unassigned'}</span>
                                            </span>
                                            <StatusBadge status={camera.status || 'inactive'} showDot={false} />
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            <CameraGallery
                cameraId={viewGalleryId || ''}
                cameraName={cameraForGallery?.camera_name || cameraForGallery?.camera_id || 'Camera'}
                isOpen={Boolean(viewGalleryId)}
                onClose={() => setViewGalleryId(null)}
            />
        </div>
    );
}

function LegendRow({ color, label, square = false }: { color: string; label: string; square?: boolean }) {
    return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <span className={`${square ? 'rounded-sm' : 'rounded-full'} h-3 w-3 ${color}`} />
            <span>{label}</span>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
        </div>
    );
}
