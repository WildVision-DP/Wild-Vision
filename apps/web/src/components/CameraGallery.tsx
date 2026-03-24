import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, Clock, AlertTriangle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CameraGalleryProps {
    cameraId: string;
    cameraName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CameraGallery({ cameraId, cameraName, isOpen, onClose }: CameraGalleryProps) {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && cameraId) {
            fetchImages();
        }
    }, [isOpen, cameraId]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`/api/images/camera/${cameraId}?limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load gallery');
            const data = await res.json();
            setImages(data.images || []);
        } catch (err) {
            console.error(err);
            setError('Could not load images');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-800 hover:bg-green-100';
            case 'rejected': return 'bg-red-100 text-red-800 hover:bg-red-100';
            default: return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Gallery: {cameraName}</h2>
                        <Badge variant="outline" className="ml-2">{images.length} images</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[400px] bg-slate-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-destructive">
                            <AlertTriangle className="w-6 h-6 mr-2" /> {error}
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">No images uploaded for this camera yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((img) => (
                                <div key={img.id} className="group relative border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className="aspect-square relative flex items-center justify-center bg-gray-100">
                                        <img
                                            src={img.thumbnail_path ? `/api/proxy?key=${img.thumbnail_path}` : 'https://placehold.co/300x300?text=No+Preview'}
                                            alt="Capture"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x300?text=Error'; }}
                                        />
                                        <div className="absolute top-2 right-2">
                                            <Badge className={getStatusColor(img.review_status)}>
                                                {img.review_status}
                                            </Badge>
                                        </div>
                                        {img.metadata?.ai_prediction && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs backdrop-blur-sm">
                                                <div className="font-semibold flex justify-between">
                                                    <span>{img.metadata.ai_prediction.species}</span>
                                                    <span>{img.metadata.ai_prediction.confidence}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 text-xs text-muted-foreground border-t">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(img.taken_at || img.created_at), { addSuffix: true })}
                                        </div>
                                        <div className="truncate" title={img.uploaded_by_name}>
                                            By: {img.uploaded_by_name || 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
