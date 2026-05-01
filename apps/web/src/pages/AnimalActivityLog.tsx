import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, MapPin, Camera, Loader, Upload, MoreVertical, CheckCircle, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AnimalDetection {
    id: string;
    detected_animal: string;
    detected_animal_scientific: string;
    detection_confidence: number;
    confirmed_at: string;
    confirmation_status?: string;
    thumbnail_path: string;
    file_path: string;
    camera_id: string;
    camera_name?: string;
    circle_name?: string;
    division_name?: string;
    range_name?: string;
    beat_name?: string;
    taken_at?: string;
    location?: string;
    metadata?: any;
}

export default function AnimalActivityLog() {
    const navigate = useNavigate();
    const [detections, setDetections] = useState<AnimalDetection[]>([]);
    const [pendingDetections, setPendingDetections] = useState<AnimalDetection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterAnimal, setFilterAnimal] = useState('');
    const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'confidence'>('recent');
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [viewMode, setViewMode] = useState<'confirmed' | 'pending' | 'all'>('confirmed');
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [approveError, setApproveError] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedAnimalName, setEditedAnimalName] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        fetchDetections();
    }, []);

    const fetchDetections = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                setIsAuthenticated(false);
                setError('Please log in first to view animal detections');
                setLoading(false);
                return;
            }

            // Fetch confirmed detections
            const confirmedResponse = await fetch('/api/images?confirmation_status=confirmed&limit=100&sort=confirmed_at', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Fetch pending detections
            const pendingResponse = await fetch('/api/images?confirmation_status=pending_confirmation&limit=100&sort=uploaded_at', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (confirmedResponse.status === 401 || pendingResponse.status === 401) {
                setIsAuthenticated(false);
                setError('Session expired. Please log in again.');
                return;
            }
            
            if (!confirmedResponse.ok) {
                throw new Error(`API error: ${confirmedResponse.status}`);
            }
            
            const confirmedData = await confirmedResponse.json();
            const pendingData = await pendingResponse.json();
            
            const confirmed = Array.isArray(confirmedData)
                ? confirmedData
                : confirmedData.images || confirmedData.data || [];
            const pending = (Array.isArray(pendingData)
                ? pendingData
                : pendingData.images || pendingData.data || []).map((d: any) => ({
                ...d,
                confirmation_status: 'pending_confirmation'
            }));
            
            setDetections(confirmed);
            setPendingDetections(pending);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load animal detections');
            setDetections([]);
            setPendingDetections([]);
        } finally {
            setLoading(false);
        }
    };

    const approveDetection = async (detectionId: string, animalName: string) => {
        try {
            setApprovingId(detectionId);
            setApproveError(null);
            
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setApproveError('Not logged in');
                setApprovingId(null);
                return;
            }

            const response = await fetch('/api/upload/confirm', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    image_id: detectionId,
                    confirmed: true,
                    detected_animal: animalName
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Failed to approve detection (${response.status})`);
            }

            // Success - remove from pending and add to confirmed
            setPendingDetections(prev => prev.filter(d => d.id !== detectionId));
            setDetections(prev => {
                const approved = pendingDetections.find(d => d.id === detectionId);
                if (approved) {
                    return [...prev, { ...approved, confirmation_status: 'confirmed', confirmed_at: new Date().toISOString(), detected_animal: animalName }];
                }
                const existing = prev.find(d => d.id === detectionId);
                if (existing) {
                    return prev.map(d => d.id === detectionId ? { ...d, detected_animal: animalName } : d);
                }
                return prev;
            });

            setApprovingId(null);
        } catch (err: any) {
            setApproveError(err.message || 'Failed to approve detection');
            setApprovingId(null);
        }
    };

    const saveEdit = async () => {
        if (!editingId || !editedAnimalName.trim()) return;
        setIsSavingEdit(true);
        try {
            await approveDetection(editingId, editedAnimalName);
            setEditingId(null);
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Filter and sort
    const activeDetections = viewMode === 'confirmed' ? detections : viewMode === 'pending' ? pendingDetections : [...detections, ...pendingDetections];
    let filteredDetections = filterAnimal
        ? activeDetections.filter(d => d.detected_animal.toLowerCase().includes(filterAnimal.toLowerCase()))
        : activeDetections;

    if (sortBy === 'oldest') {
        filteredDetections = [...filteredDetections].reverse();
    } else if (sortBy === 'confidence') {
        filteredDetections = [...filteredDetections].sort((a, b) => b.detection_confidence - a.detection_confidence);
    }

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return 'bg-green-100 text-green-800';
        if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    const getThumbnailUrl = (path: string) => {
        return path ? `/api/proxy/${path}` : '/api/proxy/placeholder.jpg';
    };

    // Get unique animals for filter
    const uniqueAnimals = [...new Set([...detections, ...pendingDetections].map(d => d.detected_animal))].sort();

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl">🦁</span>
                        <h1 className="text-4xl font-bold text-gray-800">Animal Detection Activity Log</h1>
                    </div>
                    <p className="text-gray-600 text-lg">View all confirmed animal detections with location and time metadata</p>
                </div>

                {/* View Mode Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-300">
                    <button
                        onClick={() => setViewMode('confirmed')}
                        className={`px-6 py-3 font-semibold transition-colors ${
                            viewMode === 'confirmed'
                                ? 'text-green-700 border-b-2 border-green-700'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        ✓ Confirmed ({detections.length})
                    </button>
                    <button
                        onClick={() => setViewMode('pending')}
                        className={`px-6 py-3 font-semibold transition-colors ${
                            viewMode === 'pending'
                                ? 'text-amber-700 border-b-2 border-amber-700'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        ⏳ Pending Review ({pendingDetections.length})
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-6 py-3 font-semibold transition-colors ${
                            viewMode === 'all'
                                ? 'text-blue-700 border-b-2 border-blue-700'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        All ({detections.length + pendingDetections.length})
                    </button>
                </div>

                {/* Filter and Sort Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Animal</label>
                        <select
                            value={filterAnimal}
                            onChange={(e) => setFilterAnimal(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">All Animals</option>
                            {uniqueAnimals.map(animal => (
                                <option key={animal} value={animal}>{animal}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Sort by</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="recent">Most Recent</option>
                            <option value="oldest">Oldest First</option>
                            <option value="confidence">Highest Confidence</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={fetchDetections}
                            disabled={loading}
                            className="w-full px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : '↻'}
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Error States */}
                {error && (
                    <Card className="border-red-200 bg-red-50 mb-6">
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <AlertCircle className="text-red-600 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-red-800 mb-2">{error}</h3>
                                    {!isAuthenticated && (
                                        <div className="space-y-3">
                                            <p className="text-red-700 text-sm">You need to log in to view animal detections.</p>
                                            <button
                                                onClick={() => navigate('/login')}
                                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                                            >
                                                Go to Login
                                            </button>
                                        </div>
                                    )}
                                    {detections.length === 0 && isAuthenticated && (
                                        <div className="space-y-3">
                                            <p className="text-gray-700 text-sm"><strong>Workflow to get data here:</strong></p>
                                            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                                                <li>Go to <strong>Upload Data</strong> section</li>
                                                <li>Select a wildlife photo</li>
                                                <li>Choose a camera location</li>
                                                <li>AI will automatically detect the animal</li>
                                                <li>Click <strong>Confirm</strong> to save detection</li>
                                                <li>Come back here to see it logged ✨</li>
                                            </ol>
                                            <button
                                                onClick={() => navigate('/upload')}
                                                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Go to Upload
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={fetchDetections}
                                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                            <p className="text-gray-600">Loading animal detections...</p>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredDetections.length === 0 && !error && (
                    <Card className="bg-white border-gray-200">
                        <CardContent className="py-16 text-center">
                            <div className="text-gray-400 mb-4 text-5xl">🔍</div>
                            {viewMode === 'confirmed' && detections.length === 0 && pendingDetections.length > 0 ? (
                                <>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-3">No confirmed detections yet</h3>
                                    <p className="text-gray-600 mb-6">But you have {pendingDetections.length} detection(s) awaiting review. Check the "Pending Review" tab!</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-3">No animal detections yet</h3>
                                    <p className="text-gray-600 mb-6">Start by uploading a photo to get your first detection!</p>
                                </>
                            )}
                            <button
                                onClick={() => navigate('/upload')}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold inline-flex items-center gap-2"
                            >
                                <Upload className="w-5 h-5" />
                                Upload Wildlife Photo
                            </button>
                        </CardContent>
                    </Card>
                )}

                {/* Detections Grid */}
                {!loading && filteredDetections.length > 0 && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-600">
                                        {viewMode === 'confirmed' ? 'Confirmed' : viewMode === 'pending' ? 'Pending' : 'Total'} Detections
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-600">{filteredDetections.length}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-600">Unique Species</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-purple-600">
                                        {new Set(filteredDetections.map(d => d.detected_animal)).size}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-600">Avg Confidence</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-orange-600">
                                        {filteredDetections.length > 0 ? Math.round(filteredDetections.reduce((sum, d) => sum + d.detection_confidence, 0) / filteredDetections.length) : 0}%
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-600">High Confidence</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-600">
                                        {filteredDetections.filter(d => d.detection_confidence >= 80).length}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detection Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDetections.map(detection => (
                                <Card key={detection.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                    {/* Image */}
                                    <div className="relative h-48 bg-gray-200 overflow-hidden">
                                        <img
                                            src={getThumbnailUrl(detection.thumbnail_path || detection.file_path)}
                                            alt={detection.detected_animal}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EImage unavailable%3C/text%3E%3C/svg%3E';
                                            }}
                                        />
                                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${getConfidenceColor(detection.detection_confidence)}`}>
                                            {detection.detection_confidence}% Confidence
                                        </div>
                                    </div>

                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg text-gray-800">{detection.detected_animal}</CardTitle>
                                                <p className="text-sm italic text-gray-500">{detection.detected_animal_scientific}</p>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === detection.id ? null : detection.id)}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    <MoreVertical className="w-5 h-5 text-gray-600" />
                                                </button>
                                                
                                                {/* Dropdown Menu */}
                                                {openMenuId === detection.id && (
                                                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                                        <button
                                                            onClick={() => {
                                                                approveDetection(detection.id, detection.detected_animal);
                                                                setOpenMenuId(null);
                                                            }}
                                                            disabled={approvingId === detection.id}
                                                            className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center gap-2 border-b transition-colors disabled:opacity-50"
                                                        >
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                            <span className="font-semibold text-gray-800">Accept</span>
                                                            {approvingId === detection.id && <Loader className="w-3 h-3 animate-spin ml-auto" />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditedAnimalName(detection.detected_animal);
                                                                setEditingId(detection.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Edit3 className="w-4 h-4 text-blue-600" />
                                                            <span className="font-semibold text-gray-800">Edit</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {approveError && approvingId === detection.id && (
                                            <p className="text-xs text-red-600 mt-2">{approveError}</p>
                                        )}
                                        <div className="flex justify-between items-center mt-2">
                                            <span></span>
                                            {viewMode === 'pending' || (viewMode === 'all' && detection.confirmation_status === 'pending_confirmation') ? (
                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded">⏳ Pending</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">✓ Confirmed</span>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-3 text-sm">
                                        {/* Location Info */}
                                        <div className="space-y-2">
                                            {detection.circle_name && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <MapPin className="w-4 h-4 text-blue-500" />
                                                    <span><strong>Circle:</strong> {detection.circle_name}</span>
                                                </div>
                                            )}
                                            {detection.division_name && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <MapPin className="w-4 h-4 text-green-500" />
                                                    <span><strong>Division:</strong> {detection.division_name}</span>
                                                </div>
                                            )}
                                            {detection.range_name && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <MapPin className="w-4 h-4 text-orange-500" />
                                                    <span><strong>Range:</strong> {detection.range_name}</span>
                                                </div>
                                            )}
                                            {detection.beat_name && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <MapPin className="w-4 h-4 text-red-500" />
                                                    <span><strong>Beat:</strong> {detection.beat_name}</span>
                                                </div>
                                            )}
                                            {detection.camera_name && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Camera className="w-4 h-4 text-purple-500" />
                                                    <span><strong>Camera:</strong> {detection.camera_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Time Info */}
                                        <div className="border-t pt-2 space-y-2">
                                            {detection.confirmed_at && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                    <span><strong>Confirmed:</strong> {new Date(detection.confirmed_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {detection.taken_at && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Calendar className="w-4 h-4 text-gray-500" />
                                                    <span><strong>Photo taken:</strong> {new Date(detection.taken_at).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons for Pending */}
                                        {(viewMode === 'pending' || detection.confirmation_status === 'pending_confirmation') && (
                                            <div className="border-t pt-3 mt-3 flex gap-2">
                                                <button
                                                    onClick={() => approveDetection(detection.id, detection.detected_animal)}
                                                    disabled={approvingId === detection.id}
                                                    className="flex-1 px-3 py-2 rounded font-semibold text-white text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                                >
                                                    {approvingId === detection.id ? (
                                                        <>
                                                            <Loader className="w-4 h-4 animate-spin" />
                                                            Accepting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-4 h-4" />
                                                            Accept
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditedAnimalName(detection.detected_animal);
                                                        setEditingId(detection.id);
                                                    }}
                                                    className="flex-1 px-3 py-2 rounded font-semibold text-white text-sm bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* Edit Modal */}
                {editingId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">Edit Detection</h3>
                                <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-800">
                                    <AlertCircle className="w-5 h-5 opacity-0 cursor-default" /> {/* spacing */}
                                    <span className="sr-only">Close</span>
                                ✕
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Detected Animal Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editedAnimalName}
                                        onChange={(e) => setEditedAnimalName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter animal name..."
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                    disabled={isSavingEdit}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={!editedAnimalName.trim() || isSavingEdit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                                >
                                    {isSavingEdit && <Loader className="w-4 h-4 animate-spin" />}
                                    Save & Accept
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
