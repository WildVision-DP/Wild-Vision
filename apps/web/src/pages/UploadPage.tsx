import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Upload, X, CheckCircle, AlertCircle, RefreshCw, Camera, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { initDB, addUploadToQueue, updateUploadStatus, getAllUploads, removeUpload } from '@/utils/indexedDB';
import CameraGallery from '@/components/CameraGallery';

interface UploadFileLocal {
    id: string;
    file: File;
    preview?: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
    cameraId: string;
    timestamp: number;
}

export default function UploadPage() {
    const [files, setFiles] = useState<UploadFileLocal[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Hierarchy State
    const [circles, setCircles] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [ranges, setRanges] = useState<any[]>([]);
    const [beats, setBeats] = useState<any[]>([]);
    const [cameras, setCameras] = useState<any[]>([]);

    const [selectedCircle, setSelectedCircle] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedRange, setSelectedRange] = useState('');
    const [selectedBeat, setSelectedBeat] = useState('');
    const [selectedCameraId, setSelectedCameraId] = useState('');

    // Gallery State
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);



    // Load pending uploads & initial data
    useEffect(() => {
        const loadUploads = async () => {
            try {
                await initDB();
                const storedUploads = await getAllUploads();
                const mapped = storedUploads.map((u: any) => ({
                    ...u,
                    preview: URL.createObjectURL(u.file)
                }));
                // Only show pending or error uploads, not completed ones (optional cleanup)
                // For now, keep as is but user requested queue clearing
                setFiles(mapped);
            } catch (err) {
                console.error('Failed to load uploads from DB:', err);
            }
        };
        loadUploads();
        fetchCircles();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Fetchers
    const fetchCircles = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/geography/circles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCircles(data.circles || []);
            }
        } catch (err) { console.error(err); }
    };

    const fetchDivisions = async (circleId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/geography/divisions?circle_id=${circleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDivisions(data.divisions || []);
            }
        } catch (err) { console.error(err); }
    };

    const fetchRanges = async (divisionId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/geography/ranges?division_id=${divisionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRanges(data.ranges || []);
            }
        } catch (err) { console.error(err); }
    };

    const fetchBeats = async (rangeId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/geography/beats?range_id=${rangeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBeats(data.beats || []);
            }
        } catch (err) { console.error(err); }
    };

    const fetchCameras = async (beatId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/cameras?beat_id=${beatId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Check if API returns { cameras: [...] } or just array
                setCameras(data.cameras || []);
            }
        } catch (err) { console.error(err); }
    };

    // Handlers
    const handleCircleChange = (val: string) => {
        setSelectedCircle(val);
        setSelectedDivision(''); setSelectedRange(''); setSelectedBeat(''); setSelectedCameraId('');
        setDivisions([]); setRanges([]); setBeats([]); setCameras([]);
        if (val) fetchDivisions(val);
    };

    const handleDivisionChange = (val: string) => {
        setSelectedDivision(val);
        setSelectedRange(''); setSelectedBeat(''); setSelectedCameraId('');
        setRanges([]); setBeats([]); setCameras([]);
        if (val) fetchRanges(val);
    };

    const handleRangeChange = (val: string) => {
        setSelectedRange(val);
        setSelectedBeat(''); setSelectedCameraId('');
        setBeats([]); setCameras([]);
        if (val) fetchBeats(val);
    };

    const handleBeatChange = (val: string) => {
        setSelectedBeat(val);
        setSelectedCameraId('');
        setCameras([]);
        if (val) fetchCameras(val);
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const newFiles: UploadFileLocal[] = [];
        for (const file of acceptedFiles) {
            const id = uuidv4();
            const uploadItem: UploadFileLocal = {
                id,
                file,
                preview: URL.createObjectURL(file), // createObjectURL is fine for local preview
                progress: 0,
                status: 'pending',
                cameraId: selectedCameraId || 'unknown',
                timestamp: Date.now()
            };
            newFiles.push(uploadItem);
            await addUploadToQueue({
                id: uploadItem.id,
                file: uploadItem.file,
                cameraId: uploadItem.cameraId,
                status: uploadItem.status,
                progress: 0,
                timestamp: uploadItem.timestamp
            });
        }
        setFiles(prev => [...prev, ...newFiles]);
    }, [selectedCameraId]);

    const { getRootProps, getInputProps, isDragActive, open: openFileSelector } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': [], 'image/png': [] },
        disabled: !selectedCameraId,
        noClick: true // We will use a custom button for clicking
    });

    const removeFile = async (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        await removeUpload(id);
    };

    const uploadFile = async (fileStatus: UploadFileLocal) => {
        try {
            setFiles(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'uploading' } : f));
            await updateUploadStatus(fileStatus.id, { status: 'uploading' });

            const token = localStorage.getItem('accessToken');

            // 1. Get Presigned URL
            const res = await fetch('/api/upload/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    filename: fileStatus.file.name,
                    file_type: fileStatus.file.type,
                    file_size: fileStatus.file.size,
                    camera_id: fileStatus.cameraId
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to get upload URL');
            }
            const { upload_url, file_path } = await res.json();

            // 2. Upload to MinIO
            const uploadRes = await fetch(upload_url, {
                method: 'PUT',
                body: fileStatus.file,
                headers: { 'Content-Type': fileStatus.file.type }
            });

            if (!uploadRes.ok) throw new Error('Failed to upload to storage');

            // 3. Complete
            const completeRes = await fetch('/api/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    file_path,
                    camera_id: fileStatus.cameraId,
                    original_filename: fileStatus.file.name,
                    file_size: fileStatus.file.size,
                    mime_type: fileStatus.file.type
                })
            });

            if (!completeRes.ok) throw new Error('Failed to finalize upload');

            setFiles(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'completed', progress: 100 } : f));
            await updateUploadStatus(fileStatus.id, { status: 'completed', progress: 100 });

        } catch (error: any) {
            console.error(error);
            setFiles(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'error', error: error.message } : f));
            await updateUploadStatus(fileStatus.id, { status: 'error', error: error.message });
        }
    };

    const handleUploadAll = async () => {
        if (!isOnline) {
            alert('You are offline. Uploads will be queued.');
            return;
        }
        setUploading(true);
        const toUpload = files.filter(f => f.status === 'pending' || f.status === 'error');
        await Promise.all(toUpload.map(f => uploadFile(f)));
        setUploading(false);
    };

    const handleClearQueue = async () => {
        for (const file of files) {
            if (file.status === 'completed' || file.status === 'error') {
                await removeUpload(file.id);
            }
        }
        setFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading'));
    };

    const getSelectedCameraName = () => {
        const cam = cameras.find(c => c.camera_id === selectedCameraId);
        return cam ? cam.camera_id : 'Unknown Camera';
    };





    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold tracking-tight">Upload Patrol Images</h1>
                    {!isOnline && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" /> Offline Mode
                        </span>
                    )}
                </div>
            </div>

            {!isOnline && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Internet Connection</AlertTitle>
                    <AlertDescription>Files added now will be saved locally.</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6">
                {/* 1. Camera Selection Hierarchy */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5" /> 1. Select Source Camera
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="circle">Circle</Label>
                                <select
                                    id="circle" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedCircle} onChange={e => handleCircleChange(e.target.value)}
                                >
                                    <option value="">Select Circle</option>
                                    {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="division">Division</Label>
                                <select
                                    id="division" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedDivision} onChange={e => handleDivisionChange(e.target.value)} disabled={!selectedCircle}
                                >
                                    <option value="">Select Division</option>
                                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="range">Range</Label>
                                <select
                                    id="range" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedRange} onChange={e => handleRangeChange(e.target.value)} disabled={!selectedDivision}
                                >
                                    <option value="">Select Range</option>
                                    {ranges.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="beat">Beat</Label>
                                <select
                                    id="beat" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedBeat} onChange={e => handleBeatChange(e.target.value)} disabled={!selectedRange}
                                >
                                    <option value="">Select Beat</option>
                                    {beats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2 relative">
                                <Label htmlFor="camera" className="text-primary font-bold">Camera</Label>
                                <div className="flex gap-2">
                                    <select
                                        id="camera" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-primary/50"
                                        value={selectedCameraId} onChange={e => setSelectedCameraId(e.target.value)} disabled={!selectedBeat}
                                    >
                                        <option value="">Select Camera Device</option>
                                        {cameras.map(c => <option key={c.camera_id} value={c.camera_id}>{c.camera_id} - {c.camera_name || c.camera_model}</option>)}
                                    </select>
                                    {selectedCameraId && (
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => setIsGalleryOpen(true)}
                                            title="View Gallery"
                                        >
                                            <ImageIcon className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Dropzone */}
                <Card className={!selectedCameraId ? 'opacity-50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" /> 2. Upload Images
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
                                ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
                                ${!selectedCameraId ? 'cursor-not-allowed' : ''}
                            `}
                        >
                            <input {...getInputProps()} />
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-lg font-medium">Drag & drop images from SD Card</p>
                            <p className="text-sm text-muted-foreground mt-2 mb-4">
                                {selectedCameraId ? 'Ready to process JPG/PNG files' : 'Please select a camera from the list above first'}
                            </p>
                            <Button onClick={openFileSelector} disabled={!selectedCameraId}>
                                Select Files
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. File List */}
                {files.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>3. Upload Queue ({files.length} files)</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleClearQueue}>
                                        <X className="h-4 w-4 mr-2" /> Clear Finished
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {files.map((file) => (
                                <div key={file.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                                    {file.preview && (
                                        <img src={file.preview} alt="Upload Preview" className="h-12 w-12 object-cover rounded" />
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-medium truncate">{file.file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        {file.status === 'error' && <p className="text-xs text-destructive">{file.error}</p>}
                                        {file.status === 'uploading' && <Progress value={30} className="h-1 mt-1" />}
                                    </div>
                                    <div className="w-28 text-right">
                                        {file.status === 'completed' && <span className="flex items-center justify-end text-green-600 text-sm"><CheckCircle className="w-4 h-4 mr-1" /> Done</span>}
                                        {file.status === 'uploading' && <span className="text-sm text-blue-600">Uploading...</span>}
                                        {file.status === 'error' && <span className="flex items-center justify-end text-red-600 text-sm"><AlertCircle className="w-4 h-4 mr-1" /> Error</span>}
                                        {file.status === 'pending' && <span className="text-sm text-gray-500">Pending</span>}
                                    </div>
                                    {file.status === 'pending' && (
                                        <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <div className="pt-4 flex justify-end">
                                <Button onClick={handleUploadAll} disabled={uploading || files.filter(f => f.status === 'pending').length === 0}>
                                    {uploading ? 'Uploading...' : 'Start Upload'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <CameraGallery
                cameraId={selectedCameraId}
                cameraName={getSelectedCameraName()}
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
            />
        </div>
    );
}
