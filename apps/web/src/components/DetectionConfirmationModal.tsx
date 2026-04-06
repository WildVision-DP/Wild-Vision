import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import Modal from './ui/Modal';
import { CheckCircle, RefreshCw, Loader, Edit2, Save, X, AlertCircle } from 'lucide-react';

interface DetectionConfirmationModalProps {
    isOpen: boolean;
    imageData: {
        id: string;
        thumbnail_path: string;
        file_path: string;
        detected_animal: string;
        detected_animal_scientific: string;
        confidence: number;
        camera_id: string;
        autoApproved?: boolean;
        detectionStatus?: string;
    } | null;
    onConfirm: (editedAnimal?: string) => Promise<void>;
    onReject: () => void;
    onClose?: () => void;
}

interface MinIOFileData {
    thumbnailPath: string;
}

export default function DetectionConfirmationModal({
    isOpen,
    imageData,
    onConfirm,
    onReject,
    onClose,
}: DetectionConfirmationModalProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedAnimal, setEditedAnimal] = useState(imageData?.detected_animal || '');
    const [autoApprovedShown, setAutoApprovedShown] = useState(false);

    useEffect(() => {
        if (isOpen && imageData) {
            setEditedAnimal(imageData.detected_animal);
        }
    }, [isOpen, imageData]);

    const handleConfirm = async () => {
        try {
            setIsConfirming(true);
            setError(null);
            // Pass the edited animal name to the parent
            await onConfirm(editedAnimal);
        } catch (err: any) {
            setError(err.message || 'Failed to confirm detection');
            setIsConfirming(false);
        }
    };

    // Handle manual animal name edit
    const handleSaveEdit = () => {
        if (editedAnimal.trim()) {
            setIsEditing(false);
        }
    };

    if (!imageData) return null;

    // Auto-approve high confidence and show result  
    const isAutoApproved = imageData.autoApproved || (imageData.confidence >= 0.90);
    
    // Get thumbnail URL from MinIO
    const thumbnailUrl = imageData.thumbnail_path
        ? `/api/image/${imageData.thumbnail_path}`
        : '/api/image/' + imageData.file_path.replace(/\.[^/.]+$/, '.jpg');

    const confidencePercent = Math.round(imageData.confidence * 100);
    const confidenceColor = confidencePercent >= 80 ? 'text-green-600' : 
                          confidencePercent >= 60 ? 'text-yellow-600' : 'text-red-600';

    // Auto-approved UI
    if (isAutoApproved) {
        return (
            <Modal isOpen={isOpen} onClose={onReject} title="Detection Complete - Auto Approved">
                <div className="space-y-4">
                    {/* Success Banner */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-green-900">✅ Animal Detected & Auto-Approved</p>
                            <p className="text-sm text-green-800 mt-1">
                                High confidence detection automatically saved. No manual review required.
                            </p>
                        </div>
                    </div>

                    {/* Image Preview */}
                    <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                        <img
                            src={thumbnailUrl}
                            alt="Uploaded image"
                            className="w-full h-80 object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EImage not available%3C/text%3E%3C/svg%3E';
                            }}
                        />
                    </div>

                    {/* Detection Summary */}
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-6 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Detected Animal</div>
                                    <div className="text-xl font-bold text-green-700 mt-1">{imageData.detected_animal}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Confidence</div>
                                    <div className={`text-xl font-bold ${confidenceColor} mt-1`}>{confidencePercent}%</div>
                                </div>
                            </div>
                            
                            {imageData.detected_animal_scientific && (
                                <div>
                                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Scientific Name</div>
                                    <div className="text-sm italic text-gray-700 mt-1">{imageData.detected_animal_scientific}</div>
                                </div>
                            )}

                            {/* Confidence Progress */}
                            <div>
                                <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full bg-green-600 transition-all"
                                        style={{ width: `${confidencePercent}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-600 mt-2">Detection Confidence - Automatically approved for display on dashboard and map</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Button */}
                    <Button
                        onClick={onClose || onReject}
                        className="w-full bg-green-600 hover:bg-green-700"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Done
                    </Button>
                </div>
            </Modal>
        );
    }

    // Low/Medium confidence - Manual review UI
    return (
        <Modal isOpen={isOpen} onClose={onClose || onReject} title="Confirm Animal Detection for Review">
            <div className="space-y-4">
                {/* Alert for manual review */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-yellow-900">⏳ Requires Manual Review</p>
                        <p className="text-sm text-yellow-800 mt-1">
                            Please verify the animal detection. It will be reviewed by an admin/forest officer.
                        </p>
                    </div>
                </div>

                {/* Image Preview */}
                <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                    <img
                        src={thumbnailUrl}
                        alt="Uploaded image"
                        className="w-full h-96 object-cover"
                        onError={(e) => {
                            // Fallback: show a placeholder
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EImage not available%3C/text%3E%3C/svg%3E';
                        }}
                    />
                </div>

                {/* Detection Results */}
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-lg">Detection Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Animal Name with Edit Button */}
                        <div>
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-600">Detected Animal</div>
                                {!isEditing && (
                                    <button
                                        onClick={() => {
                                            setIsEditing(true);
                                            setEditedAnimal(imageData.detected_animal);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        Edit
                                    </button>
                                )}
                            </div>
                            {isEditing ? (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={editedAnimal}
                                        onChange={(e) => setEditedAnimal(e.target.value)}
                                        className="flex-1 border border-blue-300 rounded px-3 py-2 text-sm"
                                        placeholder="Enter animal name"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSaveEdit}
                                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                                    >
                                        <Save className="w-3 h-3" />
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-400 flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-2xl font-bold text-blue-700">{editedAnimal}</div>
                            )}
                        </div>

                        {/* Scientific Name */}
                        <div>
                            <div className="text-sm font-semibold text-gray-600">Scientific Name</div>
                            <div className="text-sm italic text-gray-700">{imageData.detected_animal_scientific}</div>
                        </div>

                        {/* Confidence Score */}
                        <div>
                            <div className="text-sm font-semibold text-gray-600">Detection Confidence</div>
                            <div className={`text-xl font-bold ${confidenceColor}`}>
                                {confidencePercent}%
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-2 mt-1 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        confidencePercent >= 80 ? 'bg-green-600' :
                                        confidencePercent >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                    }`}
                                    style={{ width: `${confidencePercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Notice for low confidence */}
                        {confidencePercent < 60 && (
                            <div className="bg-red-100 border border-red-300 rounded p-3 mt-2">
                                <p className="text-sm text-red-800">
                                    ⚠️ Low confidence detection. Please verify the animal species before confirming.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-300 rounded p-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={onReject}
                        disabled={isConfirming}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Another Photo
                    </Button>
                    <Button
                        className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                        onClick={handleConfirm}
                        disabled={isConfirming}
                    >
                        {isConfirming && <Loader className="w-4 h-4 animate-spin" />}
                        {isConfirming ? 'Submitting...' : 'Submit for Review'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
