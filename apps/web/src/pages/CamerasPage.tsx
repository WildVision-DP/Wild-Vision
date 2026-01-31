import { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, List, Map as MapIcon } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import CameraForm from '@/components/CameraForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AlertDialog from '@/components/ui/AlertDialog';

export default function CamerasPage() {
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; cameraId: string | null }>({ isOpen: false, cameraId: null });
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; variant: 'error' | 'success' }>({ isOpen: false, title: '', message: '', variant: 'error' });

    useEffect(() => {
        fetchCameras();
    }, []);

    const fetchCameras = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('http://localhost:4000/cameras', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCameras(data.cameras);
            }
        } catch (error) {
            console.error('Failed to fetch cameras:', error);
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
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to create camera', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
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
                const error = await response.json();
                console.error('CamerasPage: Update failed:', error);
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to update camera', variant: 'error' });
            }
        } catch (error) {
            console.error('CamerasPage: Update network error:', error);
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
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

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Surveillance Units</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {loading ? 'Syncing...' : `${cameras.length} units online`}
                    </p>
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
                    <Button onClick={openCreateModal} className="bg-green-700 hover:bg-green-800">
                        <Plus className="mr-2 h-4 w-4" /> Add Camera
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm relative min-h-[500px]">
                {viewMode === 'map' ? (
                    <div className="h-full w-full">
                        <MapComponent cameras={cameras} />
                        {/* Overlay List for quick access? Maybe later */}
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
        </div>
    );
}
