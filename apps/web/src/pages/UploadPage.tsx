import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, AlertCircle, RefreshCw, Camera, Image as ImageIcon, CheckCircle, RotateCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import CameraGallery from '@/components/CameraGallery';
import DetectionConfirmationModal from '@/components/DetectionConfirmationModal';
import CameraCapture from '@/components/CameraCapture';
import { addUploadToQueue, removeUpload, updateUploadStatus } from '@/utils/indexedDB';

// Supported file types
const SUPPORTED_IMAGE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/x-canon-cr2': ['.cr2'],
    'image/x-canon-crw': ['.crw'],
    'image/x-nikon-nef': ['.nef'],
    'image/x-sony-arw': ['.arw'],
    'image/x-adobe-dng': ['.dng'],
    'image/tiff': ['.tif', '.tiff']
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface UploadFileLocal {
    id: string;
    file: File;
    preview?: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    cameraId: string;
    timestamp: number;
    retryCount?: number;
    error?: string;
}

type PendingDetection = {
    id: string;
    thumbnail_path: string;
    file_path: string;
    detected_animal: string;
    detected_animal_scientific: string;
    confidence: number;
    camera_id: string;
};

export default function UploadPage() {
    const [uploading, setUploading] = useState(false);
    const [cameras, setCameras] = useState<any[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');

    const [circles, setCircles] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [ranges, setRanges] = useState<any[]>([]);
    const [beats, setBeats] = useState<any[]>([]);
    const [selectedCircle, setSelectedCircle] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedRange, setSelectedRange] = useState('');
    const [selectedBeat, setSelectedBeat] = useState('');

    const [files, setFiles] = useState<UploadFileLocal[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [pendingDetection, setPendingDetection] = useState<PendingDetection | null>(null);
    const [pendingFileId, setPendingFileId] = useState<string | null>(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const uploadAbortControllers = useRef(new Map<string, AbortController>());

    const stats = useMemo(
        () => ({
            total: files.length,
            pending: files.filter((f) => f.status === 'pending').length,
            uploading: files.filter((f) => f.status === 'uploading').length,
            completed: files.filter((f) => f.status === 'completed').length,
            failed: files.filter((f) => f.status === 'error').length,
        }),
        [files]
    );

    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    useEffect(() => {
        const loadCircles = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const res = await fetch('/api/geography/circles', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setCircles(data.circles || []);
                }
            } catch (err) {
                console.error('Failed to load circles:', err);
            }
        };
        loadCircles();
    }, []);

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

    // File drop handler with validation (3.1.1.2, 3.1.1.3, 3.1.1.4)
    const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
        const errors: string[] = [];
        const newFiles: UploadFileLocal[] = [];
        
        // Handle rejected files
        rejectedFiles.forEach(({ file, errors: fileErrors }) => {
            fileErrors.forEach((error: any) => {
                if (error.code === 'file-too-large') {
                    errors.push(`${file.name}: File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                } else if (error.code === 'file-invalid-type') {
                    errors.push(`${file.name}: Unsupported file type. Only JPEG, PNG, and RAW formats (CR2, NEF, ARW, DNG) are allowed.`);
                } else {
                    errors.push(`${file.name}: ${error.message}`);
                }
            });
        });

        // Process accepted files with additional validation
        for (const file of acceptedFiles) {
            // Additional size validation (3.1.1.4)
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 50MB`);
                continue;
            }

            // Additional type validation (3.1.1.3)
            const fileExtension = file.name.toLowerCase().split('.').pop();
            const isValidType = Object.values(SUPPORTED_IMAGE_TYPES).some(exts => 
                exts.some(ext => ext === `.${fileExtension}`)
            );

            if (!isValidType) {
                errors.push(`${file.name}: Unsupported file format. Supported formats: JPG, PNG, CR2, NEF, ARW, DNG, TIFF`);
                continue;
            }

            const id = uuidv4();
            const uploadItem: UploadFileLocal = {
                id,
                file,
                preview: file.type.startsWith('image/') && file.size < 10 * 1024 * 1024 
                    ? URL.createObjectURL(file) 
                    : undefined,
                progress: 0,
                status: 'pending',
                cameraId: selectedCameraId || 'unknown',
                timestamp: Date.now(),
                retryCount: 0
            };
            
            newFiles.push(uploadItem);
            
            // Store in IndexedDB (3.1.1.7)
            await addUploadToQueue({
                id: uploadItem.id,
                file: uploadItem.file,
                cameraId: uploadItem.cameraId,
                status: uploadItem.status,
                progress: 0,
                timestamp: uploadItem.timestamp
            });
        }
        
        if (errors.length > 0) {
            setValidationErrors(errors);
            setTimeout(() => setValidationErrors([]), 10000); // Clear errors after 10 seconds
        }
        
        setFiles(prev => [...prev, ...newFiles]);
    }, [selectedCameraId]);

    const { getRootProps, getInputProps, isDragActive, open: openFileSelector } = useDropzone({
        onDrop,
        accept: SUPPORTED_IMAGE_TYPES,
        maxSize: MAX_FILE_SIZE,
        disabled: !selectedCameraId,
        noClick: true // We will use a custom button for clicking
    });

    const removeFile = async (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        await removeUpload(id);
    };

    /**
     * Single-step upload: browser → POST /api/upload/direct (multipart) → API stores in MinIO → ML → DB.
     * No presigned URLs (avoids 403 / CORS / signature issues).
     */
    const uploadFile = async (fileStatus: UploadFileLocal) => {
        const maxRetries = 3;
        const currentRetry = fileStatus.retryCount || 0;
        
        try {
            setFiles(prev => prev.map(f => f.id === fileStatus.id ? { ...f, status: 'uploading', progress: 0 } : f));
            await updateUploadStatus(fileStatus.id, { status: 'uploading', progress: 0 });

            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Not logged in');

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const abortController = new AbortController();
                uploadAbortControllers.current.set(fileStatus.id, abortController);

                const form = new FormData();
                form.append('file', fileStatus.file);
                form.append('camera_id', fileStatus.cameraId);

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 85);
                        setFiles(prev => prev.map(f =>
                            f.id === fileStatus.id ? { ...f, progress: percentComplete } : f
                        ));
                        void updateUploadStatus(fileStatus.id, { progress: percentComplete });
                    }
                });

                xhr.addEventListener('load', () => {
                    uploadAbortControllers.current.delete(fileStatus.id);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            // Support both old format (pending_detection) and new format (detection)
                            const detection = data.pending_detection || data.detection;
                            if (!detection) {
                                reject(new Error('Invalid server response'));
                                return;
                            }
                            setPendingDetection(detection);
                            setPendingFileId(fileStatus.id);
                            setFiles(prev => prev.map(f =>
                                f.id === fileStatus.id ? { ...f, status: 'completed', progress: 100 } : f
                            ));
                            void updateUploadStatus(fileStatus.id, { status: 'completed', progress: 100 });
                            resolve();
                        } catch {
                            reject(new Error('Failed to parse server response'));
                        }
                    } else {
                        let msg = `Upload failed (${xhr.status})`;
                        try {
                            const err = JSON.parse(xhr.responseText);
                            if (err.error) msg = err.error;
                        } catch { /* ignore */ }
                        reject(new Error(msg));
                    }
                });

                xhr.addEventListener('error', () => {
                    uploadAbortControllers.current.delete(fileStatus.id);
                    reject(new Error('Network error during upload'));
                });

                xhr.addEventListener('abort', () => {
                    uploadAbortControllers.current.delete(fileStatus.id);
                    reject(new Error('Upload cancelled'));
                });

                xhr.open('POST', '/api/upload/direct');
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.send(form);

                abortController.signal.addEventListener('abort', () => {
                    xhr.abort();
                });
            });

        } catch (error: any) {
            console.error(`Upload error for ${fileStatus.file.name}:`, error);
            
            // Retry logic (3.1.1.11)
            if (currentRetry < maxRetries && isOnline) {
                const nextRetry = currentRetry + 1;
                console.log(`Retry attempt ${nextRetry}/${maxRetries} for ${fileStatus.file.name}`);
                
                setFiles(prev => prev.map(f => 
                    f.id === fileStatus.id 
                        ? { ...f, status: 'pending', error: `Retry ${nextRetry}/${maxRetries}`, retryCount: nextRetry } 
                        : f
                ));
                await updateUploadStatus(fileStatus.id, { 
                    status: 'pending', 
                    error: `Retry ${nextRetry}/${maxRetries}`,
                    retryCount: nextRetry 
                });
                
                // Retry after a delay (exponential backoff)
                setTimeout(() => {
                    const updatedFile = files.find(f => f.id === fileStatus.id);
                    if (updatedFile) {
                        uploadFile({ ...updatedFile, retryCount: nextRetry });
                    }
                }, Math.min(1000 * Math.pow(2, nextRetry), 10000));
            } else {
                setFiles(prev => prev.map(f => 
                    f.id === fileStatus.id 
                        ? { ...f, status: 'error', error: error.message, retryCount: currentRetry } 
                        : f
                ));
                await updateUploadStatus(fileStatus.id, { 
                    status: 'error', 
                    error: error.message,
                    retryCount: currentRetry 
                });
            }
        }
    };

    const handleUploadAll = async () => {
        if (!isOnline) {
            alert('You are offline. Uploads will be queued and automatically resume when connection is restored.');
            return;
        }
        setUploading(true);
        const toUpload = files.filter(f => f.status === 'pending' || f.status === 'error');
        
        // Upload files sequentially to avoid overwhelming the connection
        for (const file of toUpload) {
            await uploadFile(file);
        }
        
        setUploading(false);
    };

    // Retry individual file (3.1.1.11)
    const handleRetryFile = async (fileId: string) => {
        const file = files.find(f => f.id === fileId);
        if (file) {
            await uploadFile({ ...file, retryCount: 0 }); // Reset retry count for manual retry
        }
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
        const cam = cameras.find(c => c.id === selectedCameraId || c.camera_id === selectedCameraId);
        return cam ? cam.camera_id : 'Unknown Camera';
    };

    // Handle confirmation of detected animal
    const handleDetectionConfirm = async (editedAnimal?: string) => {
        if (!pendingDetection) return;

        try {
            const token = localStorage.getItem('accessToken');
            const confirmRes = await fetch('/api/upload/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    image_id: pendingDetection.id,
                    confirmed: true,
                    detected_animal: editedAnimal || pendingDetection.detected_animal
                })
            });

            if (!confirmRes.ok) {
                const errData = await confirmRes.json();
                throw new Error(errData.error || 'Failed to confirm detection');
            }

            console.log('✅ Detection confirmed and saved:', editedAnimal || pendingDetection.detected_animal);
            setPendingDetection(null);
            setPendingFileId(null);
        } catch (error: any) {
            console.error('Confirmation error:', error);
            throw error;
        }
    };

    // Handle camera capture
    const handleCameraCapture = async (file: File) => {
        const id = uuidv4();
        const uploadItem: UploadFileLocal = {
            id,
            file,
            preview: URL.createObjectURL(file),
            progress: 0,
            status: 'pending',
            cameraId: selectedCameraId || 'unknown',
            timestamp: Date.now(),
            retryCount: 0
        };
        
        setFiles(prev => [...prev, uploadItem]);
        await addUploadToQueue({
            id: uploadItem.id,
            file: uploadItem.file,
            cameraId: uploadItem.cameraId,
            status: uploadItem.status,
            progress: 0,
            timestamp: uploadItem.timestamp
        });
        
        setIsCameraOpen(false);
    };

    // Handle rejection of detection - user wants to retake photo
    const handleDetectionReject = async () => {
        if (!pendingDetection || !pendingFileId) return;

        try {
            const token = localStorage.getItem('accessToken');
            await fetch('/api/upload/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    image_id: pendingDetection.id,
                    confirmed: false
                })
            });

            // Reset UI
            setPendingDetection(null);
            setPendingFileId(null);
            
            // Reset file status so user can upload again
            setFiles(prev => prev.map(f => 
                f.id === pendingFileId ? { ...f, status: 'pending', progress: 0 } : f
            ));
            await updateUploadStatus(pendingFileId, { status: 'pending', progress: 0 });
        } catch (error) {
            console.error('Rejection error:', error);
        }
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

            {/* Offline Alert */}
            {!isOnline && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Internet Connection</AlertTitle>
                    <AlertDescription>
                        Files added now will be saved locally and automatically uploaded when connection is restored.
                    </AlertDescription>
                </Alert>
            )}

            {/* Validation Errors Alert (3.1.1.3, 3.1.1.4) */}
            {validationErrors.length > 0 && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>File Validation Errors</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            {validationErrors.map((error, idx) => (
                                <li key={idx}>{error}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* Upload Statistics (3.1.1.10) */}
            {files.length > 0 && (
                <Card className="bg-gradient-to-r from-blue-50 to-green-50">
                    <CardHeader>
                        <CardTitle className="text-lg">Upload Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Total Files</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                <div className="text-xs text-muted-foreground">Pending</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.uploading}</div>
                                <div className="text-xs text-muted-foreground">Uploading</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                                <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                                <div className="text-xs text-muted-foreground">Failed</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
                                        id="camera" className="flex h-10 w-full rounded-md border border-primary/50 bg-background px-3 py-2 text-sm"
                                        value={selectedCameraId} onChange={e => setSelectedCameraId(e.target.value)} disabled={!selectedBeat}
                                    >
                                        <option value="">Select Camera Device</option>
                                        {cameras.map(c => <option key={c.id} value={c.id}>{c.camera_id} - {c.camera_name || c.camera_model}</option>)}
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

                {/* 2. Upload/Capture Options */}
                <Card className={!selectedCameraId ? 'opacity-50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5" /> 2. Capture or Upload Image
                        </CardTitle>
                        <CardDescription>
                            Choose to capture live from device camera or select from gallery/files
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Clear action buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Button
                                onClick={() => setIsCameraOpen(true)}
                                disabled={!selectedCameraId}
                                size="lg"
                                className="h-16 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                <Camera className="w-5 h-5" />
                                <span>📷 Capture from Camera</span>
                            </Button>
                            <Button
                                onClick={openFileSelector}
                                disabled={!selectedCameraId}
                                size="lg"
                                variant="outline"
                                className="h-16 flex flex-col items-center justify-center gap-2 hover:bg-green-50"
                            >
                                <Upload className="w-5 h-5" />
                                <span>🖼 Select from Gallery</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Dropzone */}
                <Card className={!selectedCameraId ? 'opacity-50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" /> 3. Or Drag & Drop Images
                        </CardTitle>
                        <CardDescription>
                            Files upload through the API to storage, then run animal detection. Formats: JPG, PNG, RAW (CR2, NEF, ARW, DNG, TIFF) • Max 50MB per file
                        </CardDescription>
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
                                {selectedCameraId 
                                    ? 'Drop files here or click the button below to select files' 
                                    : 'Please select a camera from the list above first'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. File List with Progress (3.1.1.5) */}
                {files.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>4. Upload Queue ({files.length} files)</CardTitle>
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
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            {file.retryCount && file.retryCount > 0 && (
                                                <span className="text-yellow-600">• Retry {file.retryCount}/3</span>
                                            )}
                                        </div>
                                        {file.status === 'error' && <p className="text-xs text-destructive mt-1">{file.error}</p>}
                                        {file.status === 'uploading' && (
                                            <div className="mt-2">
                                                <Progress value={file.progress} className="h-2" />
                                                <p className="text-xs text-muted-foreground mt-1">{file.progress}% uploaded</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-28 text-right">
                                            {file.status === 'completed' && (
                                                <span className="flex items-center justify-end text-green-600 text-sm">
                                                    <CheckCircle className="w-4 h-4 mr-1" /> Done
                                                </span>
                                            )}
                                            {file.status === 'uploading' && (
                                                <span className="text-sm text-blue-600">Uploading...</span>
                                            )}
                                            {file.status === 'error' && (
                                                <span className="flex items-center justify-end text-red-600 text-sm">
                                                    <AlertCircle className="w-4 h-4 mr-1" /> Error
                                                </span>
                                            )}
                                            {file.status === 'pending' && (
                                                <span className="text-sm text-gray-500">Pending</span>
                                            )}
                                        </div>
                                        {/* Retry button for failed uploads (3.1.1.11) */}
                                        {file.status === 'error' && isOnline && (
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => handleRetryFile(file.id)}
                                                title="Retry upload"
                                            >
                                                <RotateCw className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {file.status === 'pending' && (
                                            <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 flex justify-end">
                                <Button 
                                    onClick={handleUploadAll} 
                                    disabled={uploading || files.filter(f => f.status === 'pending' || f.status === 'error').length === 0}
                                >
                                    {uploading ? 'Uploading...' : `Upload ${stats.pending + stats.failed} Files`}
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

            {/* Camera Capture/Upload Modal */}
            <CameraCapture
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handleCameraCapture}
                cameraId={selectedCameraId}
                cameraName={getSelectedCameraName()}
            />

            {/* Detection Confirmation Modal */}
            <DetectionConfirmationModal
                isOpen={!!pendingDetection}
                imageData={pendingDetection}
                onConfirm={handleDetectionConfirm}
                onReject={handleDetectionReject}
                onClose={() => {
                    setPendingDetection(null);
                    setUploadedImageUrl(null);
                    setPendingFileId(null);
                }}
            />
        </div>
    );
}
