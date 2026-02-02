import { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, List, Map as MapIcon, TestTube, Settings } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import CameraForm from '@/components/CameraForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AlertDialog from '@/components/ui/AlertDialog';
import MapDiagnostics from '../components/MapDiagnostics';
import { defaultTestCameras, testGoogleMapsAPI } from '../utils/mapTest';

export default function CamerasPage() {
    const [cameras, setCameras] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; cameraId: string | null }>({ isOpen: false, cameraId: null });
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; variant: 'error' | 'success' }>({ isOpen: false, title: '', message: '', variant: 'error' });
    const [testMode, setTestMode] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchCameras();
        // Test Google Maps API on load
        testMapAPI();
    }, []);

    const testMapAPI = async () => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const result = await testGoogleMapsAPI(apiKey);
        
        if (!result.success) {
            console.warn('Google Maps API test failed:', result.error);
            console.warn('Details:', result.details);
        } else {
            console.log('Google Maps API test successful');
        }
    };

    const fetchCameras = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                console.warn('No access token found');
                setCameras([]);
                setLoading(false);
                return;
            }
            
            console.log('Fetching cameras...');
            const response = await fetch('http://localhost:4000/cameras', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('Camera fetch response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Camera data received:', data);
                const cameraData = data.cameras || [];
                setCameras(cameraData);
                console.log('Cameras set to state:', cameraData.length, 'cameras');
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch cameras - Response:', errorText);
                setCameras([]);
                setAlert({ isOpen: true, title: 'Error', message: 'Failed to load camera data', variant: 'error' });
            }
        } catch (error) {
            console.error('Failed to fetch cameras:', error);
            setCameras([]);
            setAlert({ isOpen: true, title: 'Network Error', message: 'Unable to connect to server', variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (data: any) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:4000/cameras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                await fetchCameras();
                closeModal();
                setAlert({ isOpen: true, title: 'Success', message: 'Camera created successfully', variant: 'success' });
            } else {
                let errorMessage = 'Failed to create camera';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) {
                    const text = await response.text();
                    errorMessage = text || errorMessage;
                }
                setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
            setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingCamera) return;
        console.log('CamerasPage: Updating camera with data:', data);
        console.log('CamerasPage: Editing camera ID:', editingCamera.id);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:4000/cameras/${editingCamera.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            console.log('CamerasPage: Update response status:', response.status);
            
            if (response.ok) {
                const responseData = await response.json();
                console.log('CamerasPage: Update successful:', responseData);
                await fetchCameras();
                closeModal();
                setAlert({ isOpen: true, title: 'Success', message: 'Camera updated successfully', variant: 'success' });
            } else {
                let errorMessage = 'Failed to update camera';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) {
                    const text = await response.text();
                    errorMessage = text || errorMessage;
                }
                console.error('CamerasPage: Update failed:', errorMessage);
                setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
            }
        } catch (error) {
            console.error('CamerasPage: Update network error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
            setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, cameraId: id });
    };

    const handleDelete = async () => {
        if (!deleteConfirm.cameraId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:4000/cameras/${deleteConfirm.cameraId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                await fetchCameras();
                setAlert({ isOpen: true, title: 'Success', message: 'Camera deleted successfully', variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to delete camera', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const openCreateModal = () => {
        console.log('CamerasPage: Opening create modal');
        setEditingCamera(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        console.log('CamerasPage: Closing modal');
        setIsModalOpen(false);
        setEditingCamera(null);
    };

    const openEditModal = (camera: any) => {
        console.log('CamerasPage: Opening edit modal for camera:', camera);
        setEditingCamera(camera);
        setIsModalOpen(true);
    };

    const activeCount = cameras.filter((c: any) => c.status === 'active').length;
    const maintenanceCount = cameras.filter((c: any) => c.status === 'maintenance').length;
    const inactiveCount = cameras.filter((c: any) => c.status === 'inactive').length;

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Surveillance Units</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {loading ? 'Syncing...' : `${cameras.length} units online`}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{activeCount}</div>
                                <div className="text-xs text-gray-500">Active</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-700">{maintenanceCount}</div>
                                <div className="text-xs text-gray-500">Maintenance</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-700">{inactiveCount}</div>
                                <div className="text-xs text-gray-500">Inactive</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                        <button
                            onClick={() => setViewMode('map')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <MapIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <Button 
                        onClick={() => setShowDiagnostics(true)}
                        variant="outline" 
                        className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                        <Settings className="mr-2 h-4 w-4" /> 
                        Diagnostics
                    </Button>
                    {cameras.length === 0 && (
                        <Button 
                            onClick={() => {
                                setTestMode(!testMode);
                                if (!testMode) {
                                    setAlert({ 
                                        isOpen: true, 
                                        title: 'Test Mode Enabled', 
                                        message: 'Showing sample camera data for map testing', 
                                        variant: 'success' 
                                    });
                                }
                            }}
                            variant="outline" 
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                            <TestTube className="mr-2 h-4 w-4" /> 
                            {testMode ? 'Exit Test' : 'Test Map'}
                        </Button>
                    )}
                    <Button onClick={openCreateModal} className="bg-green-700 hover:bg-green-800">
                        <Plus className="mr-2 h-4 w-4" /> Add Camera
                    </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm relative min-h-[500px]">
                {viewMode === 'map' ? (
                    <div className="h-full w-full">
                        <MapComponent 
                            cameras={testMode && cameras.length === 0 ? defaultTestCameras : cameras} 
                        />
                        {testMode && cameras.length === 0 && (
                            <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                                <div className="flex items-center gap-2">
                                    <TestTube size={16} />
                                    <span className="font-medium">Test Mode Active</span>
                                </div>
                                <p className="text-xs mt-1">Showing sample camera locations</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Camera Name</th>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3">Brand</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cameras.map((cam: any) => (
                                    <tr key={cam.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{cam.camera_name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{cam.camera_id}</td>
                                        <td className="px-6 py-4">{cam.brand_name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-600">{[cam.division_name, cam.range_name, cam.beat_name].filter(Boolean).join(' > ') || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cam.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    cam.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {cam.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(cam)}
                                                className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(cam.id)}
                                                className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {cameras.length === 0 && (
                            <div className="p-8 text-center text-gray-500">No cameras found. Add one to get started.</div>
                        )}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingCamera ? 'Edit Camera' : 'Add New Camera'}
            >
                <CameraForm
                    initialData={editingCamera}
                    onSubmit={editingCamera ? handleUpdate : handleCreate}
                    onCancel={closeModal}
                />
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, cameraId: null })}
                onConfirm={handleDelete}
                title="Delete Camera"
                message="Are you sure you want to delete this camera? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            <AlertDialog
                isOpen={alert.isOpen}
                onClose={() => setAlert({ ...alert, isOpen: false })}
                title={alert.title}
                message={alert.message}
                variant={alert.variant}
            />

            {showDiagnostics && (
                <MapDiagnostics onClose={() => setShowDiagnostics(false)} />
            )}
        </div>
    );
}
