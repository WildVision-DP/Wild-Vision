import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Camera, CheckCircle, Edit3, Grid3X3, List, Loader, MapPin, PawPrint, RefreshCw, Upload } from 'lucide-react';
import { ConfidenceBadge, DataToolbar, EmptyState, LoadingState, MetricCard, StatusBadge } from '@/components/common';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { normalizeConfidence } from '@/utils/detections';
import { toast } from 'sonner';

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

type StatusView = 'confirmed' | 'pending' | 'all';
type DisplayMode = 'table' | 'gallery';

export default function AnimalActivityLog() {
    const navigate = useNavigate();
    const [detections, setDetections] = useState<AnimalDetection[]>([]);
    const [pendingDetections, setPendingDetections] = useState<AnimalDetection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterAnimal, setFilterAnimal] = useState('all');
    const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'confidence'>('recent');
    const [statusView, setStatusView] = useState<StatusView>('confirmed');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedAnimalName, setEditedAnimalName] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        void fetchDetections();
    }, []);

    const fetchDetections = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('accessToken');

            if (!token) {
                setError('Please log in first to view animal detections');
                return;
            }

            const [confirmedResponse, pendingResponse] = await Promise.all([
                fetch('/api/images?confirmation_status=confirmed&limit=100&sort=confirmed_at', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch('/api/images?confirmation_status=pending_confirmation&limit=100&sort=uploaded_at', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (confirmedResponse.status === 401 || pendingResponse.status === 401) {
                setError('Session expired. Please log in again.');
                return;
            }

            if (!confirmedResponse.ok) throw new Error(`API error: ${confirmedResponse.status}`);

            const confirmedData = await confirmedResponse.json();
            const pendingData = await pendingResponse.json();
            const confirmed = Array.isArray(confirmedData) ? confirmedData : confirmedData.images || confirmedData.data || [];
            const pending = (Array.isArray(pendingData) ? pendingData : pendingData.images || pendingData.data || []).map((detection: any) => ({
                ...detection,
                confirmation_status: 'pending_confirmation',
            }));

            setDetections(confirmed);
            setPendingDetections(pending);
            toast.success('Activity log refreshed');
        } catch (error: any) {
            setError(error.message || 'Failed to load animal detections');
            setDetections([]);
            setPendingDetections([]);
            toast.error(error.message || 'Failed to load animal detections');
        } finally {
            setLoading(false);
        }
    };

    const approveDetection = async (detectionId: string, animalName: string) => {
        try {
            setApprovingId(detectionId);
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Not logged in');

            const response = await fetch('/api/upload/confirm', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_id: detectionId,
                    confirmed: true,
                    detected_animal: animalName,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Failed to approve detection (${response.status})`);
            }

            setPendingDetections((prev) => prev.filter((detection) => detection.id !== detectionId));
            setDetections((prev) => {
                const approved = pendingDetections.find((detection) => detection.id === detectionId);
                if (approved) {
                    return [
                        ...prev,
                        {
                            ...approved,
                            confirmation_status: 'confirmed',
                            confirmed_at: new Date().toISOString(),
                            detected_animal: animalName,
                        },
                    ];
                }
                return prev.map((detection) => detection.id === detectionId ? { ...detection, detected_animal: animalName } : detection);
            });

            toast.success('Detection accepted');
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve detection');
        } finally {
            setApprovingId(null);
        }
    };

    const saveEdit = async () => {
        if (!editingId || !editedAnimalName.trim()) return;
        setIsSavingEdit(true);
        try {
            await approveDetection(editingId, editedAnimalName.trim());
            setEditingId(null);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const activeDetections = useMemo(() => {
        if (statusView === 'confirmed') return detections;
        if (statusView === 'pending') return pendingDetections;
        return [...detections, ...pendingDetections];
    }, [detections, pendingDetections, statusView]);

    const filteredDetections = useMemo(() => {
        return activeDetections
            .filter((detection) => {
                if (filterAnimal !== 'all' && detection.detected_animal !== filterAnimal) return false;
                const dateValue = new Date(detection.confirmed_at || detection.taken_at || 0).getTime();
                if (dateFrom && dateValue < new Date(dateFrom).getTime()) return false;
                if (dateTo && dateValue > new Date(`${dateTo}T23:59:59`).getTime()) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'confidence') return normalizeConfidence(b.detection_confidence) - normalizeConfidence(a.detection_confidence);
                const aDate = new Date(a.confirmed_at || a.taken_at || 0).getTime();
                const bDate = new Date(b.confirmed_at || b.taken_at || 0).getTime();
                return sortBy === 'oldest' ? aDate - bDate : bDate - aDate;
            });
    }, [activeDetections, dateFrom, dateTo, filterAnimal, sortBy]);

    const uniqueAnimals = useMemo(() => (
        [...new Set([...detections, ...pendingDetections].map((detection) => detection.detected_animal).filter(Boolean))].sort()
    ), [detections, pendingDetections]);

    const stats = useMemo(() => ({
        total: filteredDetections.length,
        species: new Set(filteredDetections.map((detection) => detection.detected_animal)).size,
        avgConfidence: filteredDetections.length
            ? Math.round(filteredDetections.reduce((sum, detection) => sum + normalizeConfidence(detection.detection_confidence), 0) / filteredDetections.length)
            : 0,
        highConfidence: filteredDetections.filter((detection) => normalizeConfidence(detection.detection_confidence) >= 80).length,
    }), [filteredDetections]);

    const getThumbnailUrl = (path: string) => {
        return path ? `/api/proxy/${path}` : '/api/proxy/placeholder.jpg';
    };

    const startEdit = (detection: AnimalDetection) => {
        setEditedAnimalName(detection.detected_animal);
        setEditingId(detection.id);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Activity"
                title="Animal Activity Log"
                description="Browse confirmed and pending animal detections with location, camera, confidence, and review status."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => void fetchDetections()} disabled={loading} className="gap-2">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={() => navigate('/upload')} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload
                        </Button>
                    </div>
                }
                badges={
                    <>
                        <StatusBadge status="confirmed" label={`${detections.length} confirmed`} />
                        <StatusBadge status="pending_confirmation" label={`${pendingDetections.length} pending`} />
                    </>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Visible Records" value={stats.total} icon={PawPrint} tone="info" />
                <MetricCard label="Unique Species" value={stats.species} icon={PawPrint} />
                <MetricCard label="Avg Confidence" value={`${stats.avgConfidence}%`} icon={CheckCircle} tone="success" />
                <MetricCard label="High Confidence" value={stats.highConfidence} icon={CheckCircle} tone="success" />
            </div>

            <DataToolbar
                title="Activity filters"
                description="Filter detections by status, species, date range, and sort order."
                actions={
                    <div className="flex rounded-lg border bg-muted p-1">
                        <Button variant={displayMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setDisplayMode('table')} className="gap-2">
                            <List className="h-4 w-4" />
                            Table
                        </Button>
                        <Button variant={displayMode === 'gallery' ? 'default' : 'ghost'} size="sm" onClick={() => setDisplayMode('gallery')} className="gap-2">
                            <Grid3X3 className="h-4 w-4" />
                            Gallery
                        </Button>
                    </div>
                }
                filters={
                    <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <Select value={statusView} onValueChange={(value) => setStatusView(value as StatusView)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="pending">Pending Review</SelectItem>
                                <SelectItem value="all">All Records</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterAnimal} onValueChange={setFilterAnimal}>
                            <SelectTrigger>
                                <SelectValue placeholder="Animal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Animals</SelectItem>
                                {uniqueAnimals.map((animal) => (
                                    <SelectItem key={animal} value={animal}>{animal}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date from" />
                        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date to" />
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Most Recent</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                                <SelectItem value="confidence">Highest Confidence</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                }
            />

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-semibold">{error}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void fetchDetections()}>
                            Try Again
                        </Button>
                        {error.toLowerCase().includes('log') && (
                            <Button size="sm" onClick={() => navigate('/login')}>
                                Go to Login
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <LoadingState variant="table" />
            ) : filteredDetections.length === 0 ? (
                <EmptyState
                    title="No detections found"
                    description="Adjust filters or upload a wildlife photo to create new detections."
                    icon={PawPrint}
                    action={
                        <Button onClick={() => navigate('/upload')} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Wildlife Photo
                        </Button>
                    }
                />
            ) : displayMode === 'table' ? (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Animal</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Camera</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Confidence</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDetections.map((detection) => (
                                    <TableRow key={detection.id}>
                                        <TableCell>
                                            <div className="flex min-w-56 items-center gap-3">
                                                <img
                                                    src={getThumbnailUrl(detection.thumbnail_path || detection.file_path)}
                                                    alt={detection.detected_animal}
                                                    className="h-12 w-12 rounded-md border object-cover"
                                                    onError={(event) => {
                                                        (event.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23f0f0f0%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E';
                                                    }}
                                                />
                                                <div>
                                                    <p className="font-medium">{detection.detected_animal}</p>
                                                    <p className="text-xs italic text-muted-foreground">{detection.detected_animal_scientific || 'Scientific name unavailable'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{detection.beat_name || 'Beat not recorded'}</p>
                                                <p className="text-xs text-muted-foreground">{detection.range_name || detection.division_name || 'Location unavailable'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{detection.camera_name || detection.camera_id || 'Unknown'}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={detection.confirmation_status || 'confirmed'} />
                                        </TableCell>
                                        <TableCell>
                                            <ConfidenceBadge value={detection.detection_confidence} />
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(detection.confirmed_at || detection.taken_at || Date.now()).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(statusView === 'pending' || detection.confirmation_status === 'pending_confirmation') && (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" onClick={() => approveDetection(detection.id, detection.detected_animal)} disabled={approvingId === detection.id} className="gap-2">
                                                        {approvingId === detection.id ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                        Accept
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(detection)} className="gap-2">
                                                        <Edit3 className="h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredDetections.map((detection) => (
                        <Card key={detection.id} className="overflow-hidden">
                            <div className="relative h-48 bg-muted">
                                <img
                                    src={getThumbnailUrl(detection.thumbnail_path || detection.file_path)}
                                    alt={detection.detected_animal}
                                    className="h-full w-full object-cover"
                                    onError={(event) => {
                                        (event.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3C/svg%3E';
                                    }}
                                />
                                <div className="absolute right-3 top-3">
                                    <ConfidenceBadge value={detection.detection_confidence} />
                                </div>
                            </div>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg">{detection.detected_animal}</CardTitle>
                                        <p className="text-sm italic text-muted-foreground">{detection.detected_animal_scientific || 'Scientific name unavailable'}</p>
                                    </div>
                                    <StatusBadge status={detection.confirmation_status || 'confirmed'} showDot={false} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <InfoRow icon={MapPin} label="Location" value={[detection.division_name, detection.range_name, detection.beat_name].filter(Boolean).join(' > ') || 'Unavailable'} />
                                <InfoRow icon={Camera} label="Camera" value={detection.camera_name || detection.camera_id || 'Unknown'} />
                                <InfoRow icon={Calendar} label="Date" value={new Date(detection.confirmed_at || detection.taken_at || Date.now()).toLocaleString()} />
                                {(statusView === 'pending' || detection.confirmation_status === 'pending_confirmation') && (
                                    <div className="flex gap-2 border-t pt-3">
                                        <Button size="sm" onClick={() => approveDetection(detection.id, detection.detected_animal)} disabled={approvingId === detection.id} className="flex-1 gap-2">
                                            {approvingId === detection.id ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            Accept
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => startEdit(detection)} className="flex-1 gap-2">
                                            <Edit3 className="h-4 w-4" />
                                            Edit
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={Boolean(editingId)} onOpenChange={(open) => !open && setEditingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Detection</DialogTitle>
                        <DialogDescription>
                            Update the animal name and accept this pending detection.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>Detected Animal Name</Label>
                        <Input
                            value={editedAnimalName}
                            onChange={(event) => setEditedAnimalName(event.target.value)}
                            placeholder="Enter animal name"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingId(null)} disabled={isSavingEdit}>
                            Cancel
                        </Button>
                        <Button onClick={saveEdit} disabled={!editedAnimalName.trim() || isSavingEdit} className="gap-2">
                            {isSavingEdit && <Loader className="h-4 w-4 animate-spin" />}
                            Save and Accept
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 text-muted-foreground">
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
                <span className="font-medium text-foreground">{label}: </span>
                {value}
            </span>
        </div>
    );
}
