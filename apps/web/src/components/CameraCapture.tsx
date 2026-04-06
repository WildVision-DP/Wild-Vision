/**
 * CameraCapture Component
 * Provides camera capture and gallery selection interface
 * Features:
 * - Live camera feed
 * - Capture photo
 * - Fallback to gallery/file upload
 * - Instant image preview
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Modal from './ui/Modal';
import { Camera, Upload, X, Loader } from 'lucide-react';

interface CameraCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
    cameraId?: string;
    cameraName?: string;
}

export default function CameraCapture({
    isOpen,
    onClose,
    onCapture,
    cameraId,
    cameraName = 'Unknown Camera'
}: CameraCaptureProps) {
    const [mode, setMode] = useState<'select' | 'camera' | 'gallery'>('select');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            // Cleanup: stop stream when component unmounts
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Start camera
    const startCamera = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use rear camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setMode('camera');
        } catch (err: any) {
            console.error('Camera error:', err);
            setError(err.message || 'Cannot access camera. Make sure you granted permission.');
        } finally {
            setIsLoading(false);
        }
    };

    // Capture photo from camera
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const context = canvasRef.current.getContext('2d');
        if (!context) return;

        // Set canvas size to match video
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        // Draw video frame to canvas
        context.drawImage(videoRef.current, 0, 0);

        // Get image data
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.95);
        setCapturedImage(imageData);

        // Stop camera stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Convert captured image to File and send to parent
    const confirmCapture = () => {
        if (!capturedImage || !canvasRef.current) return;

        canvasRef.current.toBlob((blob) => {
            if (blob) {
                const timestamp = new Date().toISOString().split('T')[0];
                const file = new File(
                    [blob],
                    `capture_${cameraId}_${timestamp}_${Date.now()}.jpg`,
                    { type: 'image/jpeg' }
                );
                onCapture(file);
                resetModal();
            }
        }, 'image/jpeg', 0.95);
    };

    // Handle gallery file selection
    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onCapture(files[0]);
            resetModal();
        }
    };

    // Retake photo
    const retakePhoto = () => {
        setCapturedImage(null);
        setMode('camera');
    };

    // Reset and close modal
    const resetModal = () => {
        setMode('select');
        setCapturedImage(null);
        setError(null);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={resetModal} title={`Capture/Upload for ${cameraName}`}>
            {/* Mode Selection Screen */}
            {mode === 'select' && (
                <div className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <p className="text-sm text-gray-600 mb-6">
                        Choose how you want to provide an image for animal detection.
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        {/* Camera Capture Option */}
                        <Button
                            onClick={startCamera}
                            disabled={isLoading}
                            variant="outline"
                            className="h-auto py-8 flex flex-col items-center justify-center gap-3 hover:bg-blue-50"
                        >
                            {isLoading ? (
                                <Loader className="w-8 h-8 animate-spin text-blue-600" />
                            ) : (
                                <Camera className="w-8 h-8 text-blue-600" />
                            )}
                            <div>
                                <div className="font-semibold">📷 Capture from Camera</div>
                                <div className="text-xs text-gray-500">Take a live photo using device camera</div>
                            </div>
                        </Button>

                        {/* Gallery/File Selection Option */}
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="h-auto py-8 flex flex-col items-center justify-center gap-3 hover:bg-green-50"
                        >
                            <Upload className="w-8 h-8 text-green-600" />
                            <div>
                                <div className="font-semibold">🖼 Select from Gallery</div>
                                <div className="text-xs text-gray-500">Choose image from device storage</div>
                            </div>
                        </Button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleGallerySelect}
                    />
                </div>
            )}

            {/* Camera Stream Screen */}
            {mode === 'camera' && !capturedImage && (
                <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-80 object-cover"
                        />
                        <canvas ref={canvasRef} hidden />
                    </div>

                    <p className="text-sm text-center text-gray-600">
                        Position the animal in the frame and tap "Capture Photo"
                    </p>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                if (stream) {
                                    stream.getTracks().forEach(track => track.stop());
                                    setStream(null);
                                }
                                setMode('select');
                            }}
                            variant="outline"
                            className="flex-1"
                        >
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button
                            onClick={capturePhoto}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            <Camera className="w-4 h-4 mr-2" /> Capture Photo
                        </Button>
                    </div>
                </div>
            )}

            {/* Preview Screen */}
            {mode === 'camera' && capturedImage && (
                <div className="space-y-4">
                    <div className="bg-gray-100 rounded-lg overflow-hidden">
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-80 object-cover"
                        />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700">
                            ✅ Image captured successfully! Confirm to proceed with animal detection.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={retakePhoto}
                            variant="outline"
                            className="flex-1"
                        >
                            <Camera className="w-4 h-4 mr-2" /> Retake Photo
                        </Button>
                        <Button
                            onClick={confirmCapture}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            ✓ Confirm & Detect
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
