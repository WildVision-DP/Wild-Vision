import { useState, useEffect } from 'react';
import { Camera, MapPin, AlertCircle, Filter, ChevronUp, ChevronDown, Grid3X3, BarChart3 } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import CameraGallery from '@/components/CameraGallery';
import AdvancedDashboard from '@/components/AdvancedDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
        pendingReview: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewGalleryId, setViewGalleryId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'overview' | 'advanced'>('overview');
    
    // Filtering & Sorting state
    const [animalFilter, setAnimalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateMin, setDateMin] = useState('');
    const [dateMax, setDateMax] = useState('');
    const [confidenceMin, setConfidenceMin] = useState(0);
    const [confidenceMax, setConfidenceMax] = useState(100);
    const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'confidence_high' | 'name_asc'>('latest');
    const [filterOpen, setFilterOpen] = useState(false);
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchDashboardData();
        
        // Listen for map popup events
        const handleOpenGallery = (e: any) => {
            if (e.detail) setViewGalleryId(e.detail);
        };
        window.addEventListener('open-camera-gallery', handleOpenGallery);
        return () => window.removeEventListener('open-camera-gallery', handleOpenGallery);
    }, [animalFilter, statusFilter, dateMin, dateMax, confidenceMin, confidenceMax, sortBy]);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Dashboard: Token exists:', !!token);

            if (!token) {
                console.error('Dashboard: No auth token found, redirecting to login');
                window.location.href = '/';
                return;
            }

            const headers = { 'Authorization': `Bearer ${token}` };
            console.log('Dashboard: Making API calls...');

            const [camerasRes, divisionsRes, rangesRes, beatsRes, detectionsRes] = await Promise.all([
                fetch('/api/cameras', { headers }),
                fetch('/api/geography/divisions', { headers }),
                fetch('/api/geography/ranges', { headers }),
                fetch('/api/geography/beats', { headers }),
                fetch('/api/images?confirmation_status=confirmed&limit=10&sort=confirmed_at', { headers })
            ]);

            console.log('Dashboard: API responses:', {
                cameras: camerasRes.status,
                divisions: divisionsRes.status,
                ranges: rangesRes.status,
                beats: beatsRes.status,
                detections: detectionsRes.status
            });

            // Check for auth failure
            if (!camerasRes.ok && camerasRes.status === 401) {
                console.error('Dashboard: Auth failed, redirecting to login');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            if (camerasRes.ok) {
                const data = await camerasRes.json();
                const cameras = data.cameras || [];
                console.log('Dashboard: Cameras loaded:', cameras.length);
                setCameras(cameras);
                setCameraStats({
                    total: cameras.length,
                    active: cameras.filter((c: any) => c.status === 'active').length,
                    inactive: cameras.filter((c: any) => c.status === 'inactive').length,
                    maintenance: cameras.filter((c: any) => c.status === 'maintenance').length
                });
            } else {
                console.error('Dashboard: Failed to fetch cameras:', await camerasRes.text());
            }

            if (divisionsRes.ok && rangesRes.ok && beatsRes.ok) {
                const [divData, rangeData, beatData] = await Promise.all([
                    divisionsRes.json(),
                    rangesRes.json(),
                    beatsRes.json()
                ]);
                console.log('Dashboard: Geography loaded:', {
                    divisions: divData.divisions?.length,
                    ranges: rangeData.ranges?.length,
                    beats: beatData.beats?.length
                });
                setGeographyStats({
                    divisions: (divData.divisions || []).length,
                    ranges: (rangeData.ranges || []).length,
                    beats: (beatData.beats || []).length
                });
            } else {
                console.error('Dashboard: Failed to fetch geography data');
            }

            // Fetch detections with stats
            if (detectionsRes.ok) {
                const detectionsData = await detectionsRes.json();
                const detections = Array.isArray(detectionsData) ? detectionsData : detectionsData.images || [];
                console.log('Dashboard: Confirmed detections loaded:', detections.length);
                setConfirmedDetections(detections);
                
                // Calculate detection stats
                const stats = {
                    autoApproved: detections.filter((d: any) => isAutoApprovedDetection(d)).length,
                    manualApproved: detections.filter((d: any) => getDetectionReviewStatus(d) === 'manual_confirmed').length,
                    pendingReview: detections.filter((d: any) => getDetectionReviewStatus(d) === 'pending_confirmation').length
                };
                setDetectionStats(stats);
            } else {
                console.warn('Dashboard: Failed to fetch detections');
                setConfirmedDetections([]);
                setDetectionStats({ autoApproved: 0, manualApproved: 0, pendingReview: 0 });
            }
        } catch (error) {
            console.error('Dashboard: Failed to fetch data:', error);

            // If it's a network error, might be API server down
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('Dashboard: API server appears to be down');
                setError('Unable to connect to server. Please ensure the API server is running.');
            } else {
                console.error('Dashboard: Unexpected error:', error);
                setError('Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-900 font-semibold">Error Loading Dashboard</h3>
                    <p className="text-red-700 mt-1">{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            setLoading(true);
                            fetchDashboardData();
                        }}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
                <p className="text-gray-500">Welcome back, {user.fullName}</p>
            </div>

            {/* View Mode Tabs */}
            <div className="mb-6 flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setViewMode('overview')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition ${
                        viewMode === 'overview'
                            ? 'text-green-700 border-b-2 border-green-700'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    <Grid3X3 size={20} />
                    Overview
                </button>
                <button
                    onClick={() => setViewMode('advanced')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition ${
                        viewMode === 'advanced'
                            ? 'text-green-700 border-b-2 border-green-700'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    <BarChart3 size={20} />
                    Advanced Analytics
                </button>
            </div>

            {/* Advanced Dashboard View */}
            {viewMode === 'advanced' && <AdvancedDashboard />}

            {/* Overview View */}
            {viewMode === 'overview' && (
            <>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Camera className="w-8 h-8 text-green-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Camera Network</h3>
                </div>
                <div className="grid grid-cols-4 gap-6">
                    <div className="relative p-6 bg-green-50 border border-green-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <Camera className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-green-700">Total Cameras</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-green-800">{cameraStats.total}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-emerald-50 border border-emerald-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-emerald-700">Active & Recording</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-emerald-800">{cameraStats.active}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full opacity-50"></div>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-gray-700">Offline</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-gray-800">{cameraStats.inactive}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-amber-50 border border-amber-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-amber-700">Under Repair</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-amber-800">{cameraStats.maintenance}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Geography Coverage - Full Width */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-8 h-8 text-blue-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Area Coverage</h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="relative p-6 bg-green-50 border border-green-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-bold">D</span>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-green-700">Administrative Divisions</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-green-800">{geographyStats.divisions}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-blue-50 border border-blue-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-bold">R</span>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-blue-700">Forest Ranges Covered</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-blue-800">{geographyStats.ranges}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-purple-50 border border-purple-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-bold">B</span>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-purple-700">Beat Areas Monitored</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-purple-800">{geographyStats.beats}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Confirmed Detections with Advanced Filtering */}
            {confirmedDetections.length > 0 && (
                <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <AlertCircle className="w-8 h-8 text-orange-700" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800">Animal Detections (Approved)</h3>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setFilterOpen(!filterOpen)}
                            className="flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            {filterOpen ? 'Hide' : 'Show'} Filters
                        </Button>
                    </div>

                    {/* Detection Status Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <Card className="p-4 bg-green-50 border-green-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{detectionStats.autoApproved}</div>
                                <div className="text-xs text-green-600 mt-1">Auto Approved</div>
                            </div>
                        </Card>
                        <Card className="p-4 bg-blue-50 border-blue-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-700">{detectionStats.manualApproved}</div>
                                <div className="text-xs text-blue-600 mt-1">Manual Approved</div>
                            </div>
                        </Card>
                        <Card className="p-4 bg-yellow-50 border-yellow-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-700">{detectionStats.pendingReview}</div>
                                <div className="text-xs text-yellow-600 mt-1">Pending Review</div>
                            </div>
                        </Card>
                    </div>

                    {/* Filter Section */}
                    {filterOpen && (
                        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-700">Animal Type</label>
                                    <Input
                                        placeholder="Filter by animal..."
                                        value={animalFilter}
                                        onChange={(e) => setAnimalFilter(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-700">Status</label>
                                    <select 
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full mt-1 border rounded px-2 py-2 text-sm"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="auto_approved">Auto Approved</option>
                                        <option value="manual_confirmed">Manual Approved</option>
                                        <option value="pending_confirmation">Pending Review</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-700">Min Confidence</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={confidenceMin}
                                        onChange={(e) => setConfidenceMin(parseInt(e.target.value) || 0)}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-700">Max Confidence</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={confidenceMax}
                                        onChange={(e) => setConfidenceMax(parseInt(e.target.value) || 100)}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-700">Sort By</label>
                                    <select 
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="w-full mt-1 border rounded px-2 py-2 text-sm"
                                    >
                                        <option value="latest">Latest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="confidence_high">Confidence High→Low</option>
                                        <option value="name_asc">Animal Name (A-Z)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        setAnimalFilter('');
                                        setStatusFilter('all');
                                        setConfidenceMin(0);
                                        setConfidenceMax(100);
                                        setSortBy('latest');
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Detections Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {confirmedDetections
                            .filter((d) => {
                                if (animalFilter && !d.detected_animal.toLowerCase().includes(animalFilter.toLowerCase())) return false;
                                if (statusFilter !== 'all' && getDetectionReviewStatus(d) !== statusFilter) return false;
                                const conf = normalizeConfidence(d.detection_confidence);
                                if (conf < confidenceMin || conf > confidenceMax) return false;
                                return true;
                            })
                            .sort((a, b) => {
                                switch (sortBy) {
                                    case 'latest':
                                        return new Date(b.confirmed_at || 0).getTime() - new Date(a.confirmed_at || 0).getTime();
                                    case 'oldest':
                                        return new Date(a.confirmed_at || 0).getTime() - new Date(b.confirmed_at || 0).getTime();
                                    case 'confidence_high':
                                        return normalizeConfidence(b.detection_confidence) - normalizeConfidence(a.detection_confidence);
                                    case 'name_asc':
                                        return (a.detected_animal || '').localeCompare(b.detected_animal || '');
                                    default:
                                        return 0;
                                }
                            })
                            .map((detection) => {
                                const confidence = normalizeConfidence(detection.detection_confidence);
                                const reviewStatus = getDetectionReviewStatus(detection);
                                return (
                                <div key={detection.id} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                                    {/* Thumbnail */}
                                    <div className="relative w-full h-48 bg-gray-200">
                                        {detection.thumbnail_path ? (
                                            <img
                                                src={`/api/proxy/${detection.thumbnail_path}`}
                                                alt={detection.detected_animal}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22%3ENo image%3C/text%3E%3C/svg%3E';
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-500">
                                                No thumbnail
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-white text-xs font-semibold ${
                                            reviewStatus === 'auto_approved' ? 'bg-green-600' :
                                            reviewStatus === 'manual_confirmed' ? 'bg-blue-600' :
                                            reviewStatus === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'
                                        }`}>
                                            {getDetectionReviewLabel(detection)}
                                        </div>
                                        {/* Confidence Badge */}
                                        {detection.detection_confidence && (
                                            <div className={`absolute top-2 right-2 px-2 py-1 rounded text-white text-xs font-semibold ${
                                                confidence >= 80 ? 'bg-green-600' :
                                                confidence >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                            }`}>
                                                {confidence}%
                                            </div>
                                        )}
                                    </div>
                                    {/* Details */}
                                    <div className="p-4">
                                        <h4 className="font-semibold text-lg text-green-700">{detection.detected_animal}</h4>
                                        <p className="text-xs text-gray-600 italic">{detection.detected_animal_scientific}</p>
                                        {detection.beat_name && <p className="text-xs text-gray-500 mt-2">📍 {detection.beat_name}</p>}
                                        <div className="mt-2 text-xs text-gray-500">
                                            {detection.confirmed_at && (
                                                <div>
                                                    ✓ {new Date(detection.confirmed_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Camera Map */}
            <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-8 h-8 text-blue-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Camera Network Map</h3>
                </div>
                <div className="h-96 rounded-lg border border-gray-200 overflow-hidden">
                    <MapComponent cameras={cameras} />
                </div>
            </div>

            {/* Camera Gallery Modal */}
            <CameraGallery
                cameraId={viewGalleryId || ''}
                cameraName={cameras.find(c => c.id === viewGalleryId)?.camera_name || 'Camera'}
                isOpen={!!viewGalleryId}
                onClose={() => setViewGalleryId(null)}
            />
            </>
            )}
        </div>
    );
}
