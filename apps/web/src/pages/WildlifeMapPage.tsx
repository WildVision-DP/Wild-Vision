import { useEffect, useState } from 'react';
import MapComponent from '../components/MapComponent';
import CameraGallery from '@/components/CameraGallery';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PawPrint, Video, RefreshCw, AlertCircle, X } from 'lucide-react';

type Camera = {
    id: string;
    camera_id: string;
    camera_name: string;
    latitude: number;
    longitude: number;
    status: string;
    notes?: string;
    division_name?: string;
    range_name?: string;
};

type Detection = {
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
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewGalleryId, setViewGalleryId] = useState<string | null>(null);

    useEffect(() => {
        fetchMapData();

        // Listen for map popup events
        const handleOpenGallery = (e: any) => {
            if (e.detail) {
                console.log('WildlifeMap: Opening gallery for camera:', e.detail);
                setViewGalleryId(e.detail);
            }
        };
        window.addEventListener('open-camera-gallery', handleOpenGallery);
        return () => window.removeEventListener('open-camera-gallery', handleOpenGallery);
    }, []);

    const fetchMapData = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setError('No authentication token found');
                setLoading(false);
                return;
            }

            const headers = { 'Authorization': `Bearer ${token}` };

            const [camerasRes, detectionsRes] = await Promise.all([
                fetch('/api/cameras', { headers }),
                fetch('/api/images?confirmation_status=confirmed&limit=50&sort=confirmed_at', { headers })
            ]);

            if (camerasRes.ok) {
                const data = await camerasRes.json();
                setCameras(data.cameras || []);
            }

            if (detectionsRes.ok) {
                const data = await detectionsRes.json();
                setDetections(data.images || []);
            } else {
                console.warn('Failed to fetch detections');
            }
        } catch (e: any) {
            console.error('Failed to load map data:', e);
            setError(e.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <PawPrint className="w-6 h-6 text-green-700" />
                        Wildlife Activity Map
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Live camera network with confirmed animal detections.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchMapData}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </Card>
            )}

            {loading ? (
                <Card className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading map data...</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 flex-1 min-h-[500px]">
                    <Card className="relative overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Video className="w-4 h-4 text-green-600" />
                                <span>Camera Network Map</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                {cameras.length} cameras · {detections.length} confirmed detections
                            </div>
                        </div>
                        <div className="flex-1">
                            <MapComponent cameras={cameras} />
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <Card className="p-4">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3">Legend</h2>
                            <div className="space-y-2 text-xs text-gray-700">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                                    <span>Active camera</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
                                    <span>Maintenance camera</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                                    <span>Offline camera</span>
                                </div>
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                                    <span className="inline-block w-3 h-3 rounded bg-orange-600" />
                                    <span>Confirmed detections</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 max-h-[340px] overflow-auto flex flex-col">
                            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2 sticky top-0 bg-white pb-2">
                                <PawPrint className="w-4 h-4 text-green-700" />
                                Confirmed Detections
                            </h2>
                            <div className="space-y-2 text-xs flex-1">
                                {detections.length > 0 ? (
                                    detections.map((detection) => (
                                        <div
                                            key={detection.id}
                                            className="border rounded-md px-3 py-2 hover:bg-gray-50 cursor-default bg-orange-50 border-orange-200"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-semibold text-gray-900">
                                                        {detection.detected_animal}
                                                    </div>
                                                    <div className="text-gray-600 text-[11px]">
                                                        {detection.detected_animal_scientific}
                                                    </div>
                                                </div>
                                                {detection.detection_confidence && (
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${'bg-green-100 text-green-800'}`}>
                                                        {detection.detection_confidence}%
                                                    </span>
                                                )}
                                            </div>
                                            {detection.confirmed_at && (
                                                <div className="text-[10px] text-gray-500 mt-1">
                                                    ✓ {new Date(detection.confirmed_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 text-center py-4">
                                        No confirmed detections yet
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
            {/* Camera Gallery Modal */}
            <CameraGallery
                cameraId={viewGalleryId || ''}
                cameraName={cameras.find(c => c.id === viewGalleryId)?.camera_name || (cameras.find(c => c.id === viewGalleryId)?.camera_id) || 'Camera'}
                isOpen={!!viewGalleryId}
                onClose={() => setViewGalleryId(null)}
            />
        </div>
    );
}
