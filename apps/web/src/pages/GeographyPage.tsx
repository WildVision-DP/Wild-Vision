import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Layers, Edit2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AlertDialog from '@/components/ui/AlertDialog';
import DivisionForm from '@/components/DivisionForm';
import RangeForm from '@/components/RangeForm';
import BeatForm from '@/components/BeatForm';

export default function GeographyPage() {
    const [divisions, setDivisions] = useState<any[]>([]);
    const [ranges, setRanges] = useState<any[]>([]);
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'divisions' | 'ranges' | 'beats'>('divisions');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: string; id: string | null }>({ isOpen: false, type: '', id: null });
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; variant: 'error' | 'success' }>({ isOpen: false, title: '', message: '', variant: 'error' });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const canManageGeography = currentUser.role !== 'Ground Staff';

    // Debug logging
    console.log('GeographyPage render - State:', {
        divisions: Array.isArray(divisions) ? divisions.length : 'not array',
        ranges: Array.isArray(ranges) ? ranges.length : 'not array', 
        beats: Array.isArray(beats) ? beats.length : 'not array',
        loading,
        error,
        activeTab
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchAll();
            } catch (err) {
                console.error('Geography component mount error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load geography data');
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        setError(null);
        console.log('Geography: Starting fetch all');
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please login again.');
            }
            console.log('Geography: Token present:', !!token);
            const headers = { 'Authorization': `Bearer ${token}` };

            const [divisionsRes, rangesRes, beatsRes] = await Promise.all([
                fetch('http://localhost:4000/geography/divisions', { headers }),
                fetch('http://localhost:4000/geography/ranges', { headers }),
                fetch('http://localhost:4000/geography/beats', { headers })
            ]);

            console.log('Geography: Response statuses:', {
                divisions: divisionsRes.status,
                ranges: rangesRes.status,
                beats: beatsRes.status
            });

            if (divisionsRes.ok) {
                const data = await divisionsRes.json();
                console.log('Geography: Divisions data:', data);
                setDivisions(Array.isArray(data.divisions) ? data.divisions : []);
            } else {
                const errorText = await divisionsRes.text();
                console.error('Failed to fetch divisions:', errorText);
                setDivisions([]);
            }
            if (rangesRes.ok) {
                const data = await rangesRes.json();
                console.log('Geography: Ranges data:', data);
                setRanges(Array.isArray(data.ranges) ? data.ranges : []);
            } else {
                const errorText = await rangesRes.text();
                console.error('Failed to fetch ranges:', errorText);
                setRanges([]);
            }
            if (beatsRes.ok) {
                const data = await beatsRes.json();
                console.log('Geography: Beats data:', data);
                setBeats(Array.isArray(data.beats) ? data.beats : []);
            } else {
                const errorText = await beatsRes.text();
                console.error('Failed to fetch beats:', errorText);
                setBeats([]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Failed to fetch geography data:', error);
            setError(errorMessage);
            setDivisions([]);
            setRanges([]);
            setBeats([]);
        } finally {
            console.log('Geography: Fetch completed');
            setLoading(false);
        }
    };

    const handleCreate = async (data: any) => {
        try {
            const token = localStorage.getItem('accessToken');
            const endpoint = activeTab === 'divisions' ? 'divisions' : activeTab === 'ranges' ? 'ranges' : 'beats';
            const response = await fetch(`http://localhost:4000/geography/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                await fetchAll();
                setIsModalOpen(false);
                setAlert({ isOpen: true, title: 'Success', message: `${activeTab.slice(0, -1)} created successfully`, variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to create', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingItem) return;
        try {
            const token = localStorage.getItem('accessToken');
            const endpoint = activeTab === 'divisions' ? 'divisions' : activeTab === 'ranges' ? 'ranges' : 'beats';
            const response = await fetch(`http://localhost:4000/geography/${endpoint}/${editingItem.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                await fetchAll();
                setIsModalOpen(false);
                setEditingItem(null);
                setAlert({ isOpen: true, title: 'Success', message: `${activeTab.slice(0, -1)} updated successfully`, variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to update', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const confirmDelete = (type: string, id: string) => {
        setDeleteConfirm({ isOpen: true, type, id });
    };

    const handleDelete = async () => {
        if (!deleteConfirm.id) return;
        try {
            const token = localStorage.getItem('accessToken');
            const endpoint = deleteConfirm.type;
            const response = await fetch(`http://localhost:4000/geography/${endpoint}/${deleteConfirm.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            setDeleteConfirm({ isOpen: false, type: '', id: null });

            if (response.ok) {
                await fetchAll();
                setAlert({ isOpen: true, title: 'Success', message: 'Deleted successfully', variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to delete', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item: any) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const renderDivisions = () => {
        const safeDivisions = Array.isArray(divisions) ? divisions : [];
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {safeDivisions.map((division: any) => {
                    if (!division || !division.id) return null;
                    return (
                        <Card key={division.id} className="p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <MapPin className="w-5 h-5 text-green-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900">{division.name || 'Unnamed'}</h3>
                                        <p className="text-sm text-gray-500">Code: {division.code || 'N/A'}</p>
                                    </div>
                                </div>
                                {canManageGeography && (
                                    <div className="flex gap-1">
                                        <button onClick={() => openEditModal(division)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => confirmDelete('divisions', division.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Area:</span>
                                    <span className="font-medium">{typeof division.area_sq_km === 'number' ? division.area_sq_km.toFixed(2) : (parseFloat(division.area_sq_km) || 0).toFixed(2)} km²</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Perimeter:</span>
                                    <span className="font-medium">{typeof division.perimeter_km === 'number' ? division.perimeter_km.toFixed(2) : (parseFloat(division.perimeter_km) || 0).toFixed(2)} km</span>
                                </div>
                            </div>
                        </Card>
                    );
                })}
                {safeDivisions.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No divisions found
                    </div>
                )}
            </div>
        );
    };

    const renderRanges = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(ranges || []).map((range: any) => (
                <Card key={range.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Layers className="w-5 h-5 text-blue-700" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">{range.name}</h3>
                                <p className="text-sm text-gray-500">Code: {range.code}</p>
                            </div>
                        </div>
                        {canManageGeography && (
                            <div className="flex gap-1">
                                <button onClick={() => openEditModal(range)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => confirmDelete('ranges', range.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Division:</span>
                            <span className="font-medium">{range.division_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Area:</span>
                            <span className="font-medium">{typeof range.area_sq_km === 'number' ? range.area_sq_km.toFixed(2) : (parseFloat(range.area_sq_km) || 0).toFixed(2)} km²</span>
                        </div>
                    </div>
                </Card>
            ))}
            {(ranges || []).length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                    No ranges found
                </div>
            )}
        </div>
    );

    const renderBeats = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(beats || []).map((beat: any) => (
                <Card key={beat.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <MapPin className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">{beat.name}</h3>
                                <p className="text-sm text-gray-500">Code: {beat.code}</p>
                            </div>
                        </div>
                        {canManageGeography && (
                            <div className="flex gap-1">
                                <button onClick={() => openEditModal(beat)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => confirmDelete('beats', beat.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Range:</span>
                            <span className="font-medium">{beat.range_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Division:</span>
                            <span className="font-medium">{beat.division_name || 'N/A'}</span>
                        </div>
                    </div>
                </Card>
            ))}
            {(beats || []).length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                    No beats found
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="text-red-600 mb-4">
                        <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Geography Data</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => {
                            setError(null);
                            fetchAll();
                        }}
                        className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Geography Management</h1>
                    <p className="text-gray-600">Manage forest administrative boundaries</p>
                </div>
                {canManageGeography && (
                    <Button onClick={openCreateModal} className="flex items-center gap-2">
                        <Plus size={20} />
                        Add {activeTab === 'divisions' ? 'Division' : activeTab === 'ranges' ? 'Range' : 'Beat'}
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('divisions')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                        activeTab === 'divisions'
                            ? 'border-green-700 text-green-700'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Divisions ({(divisions || []).length})
                </button>
                <button
                    onClick={() => setActiveTab('ranges')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                        activeTab === 'ranges'
                            ? 'border-green-700 text-green-700'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Ranges ({(ranges || []).length})
                </button>
                <button
                    onClick={() => setActiveTab('beats')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                        activeTab === 'beats'
                            ? 'border-green-700 text-green-700'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Beats ({(beats || []).length})
                </button>
            </div>

            {/* Content */}
            <div>
                {activeTab === 'divisions' && renderDivisions()}
                {activeTab === 'ranges' && renderRanges()}
                {activeTab === 'beats' && renderBeats()}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
                title={`${editingItem ? 'Edit' : 'Add'} ${activeTab === 'divisions' ? 'Division' : activeTab === 'ranges' ? 'Range' : 'Beat'}`}
            >
                {activeTab === 'divisions' && (
                    <DivisionForm
                        initialData={editingItem}
                        onSubmit={editingItem ? handleUpdate : handleCreate}
                        onCancel={() => { setIsModalOpen(false); setEditingItem(null); }}
                    />
                )}
                {activeTab === 'ranges' && (
                    <RangeForm
                        initialData={editingItem}
                        divisions={divisions}
                        onSubmit={editingItem ? handleUpdate : handleCreate}
                        onCancel={() => { setIsModalOpen(false); setEditingItem(null); }}
                    />
                )}
                {activeTab === 'beats' && (
                    <BeatForm
                        initialData={editingItem}
                        ranges={ranges}
                        onSubmit={editingItem ? handleUpdate : handleCreate}
                        onCancel={() => { setIsModalOpen(false); setEditingItem(null); }}
                    />
                )}
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, type: '', id: null })}
                onConfirm={handleDelete}
                title="Delete Confirmation"
                message="Are you sure you want to delete this item? This action cannot be undone."
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
