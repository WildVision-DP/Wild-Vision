import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CameraFormProps {
    initialData?: any;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

export default function CameraForm({ initialData, onSubmit, onCancel }: CameraFormProps) {
    const [formData, setFormData] = useState({
        camera_id: '',
        brand_id: '',
        camera_name: '',
        circle_id: '',
        division_id: '',
        range_id: '',
        beat_id: '',
        latitude: '',
        longitude: '',
        notes: '',
        status: 'active',
    });

    const [brands, setBrands] = useState<any[]>([]);
    const [circles, setCircles] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [ranges, setRanges] = useState<any[]>([]);
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Generate camera ID preview
    const selectedBrand = brands.find(b => b.id === formData.brand_id);
    const selectedCircle = circles.find(c => c.id === formData.circle_id);
    const selectedDivision = divisions.find(d => d.id === formData.division_id);
    const selectedRange = ranges.find(r => r.id === formData.range_id);
    const selectedBeat = beats.find(b => b.id === formData.beat_id);

    let cameraIdPreview = '';
    if (selectedBrand) {
        cameraIdPreview = selectedBrand.code;
        if (selectedDivision) {
            cameraIdPreview += `-${selectedDivision.code}`;
            if (selectedRange) {
                cameraIdPreview += `-${selectedRange.code}`;
                if (selectedBeat) {
                    cameraIdPreview += `-${selectedBeat.code}-CAM##`;
                } else {
                    cameraIdPreview += '-[BEAT]-CAM##';
                }
            } else {
                cameraIdPreview += '-[RANGE]-[BEAT]-CAM##';
            }
        } else {
            cameraIdPreview += '-[DIVISION]-[RANGE]-[BEAT]-CAM##';
        }
    } else {
        cameraIdPreview = '[BRAND]-[DIVISION]-[RANGE]-[BEAT]-CAM##';
    }

    useEffect(() => {
        fetchBrands();
        fetchCircles();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                camera_id: initialData.camera_id || '',
                brand_id: initialData.brand_id || '',
                camera_name: initialData.camera_name || '',
                circle_id: initialData.circle_id || '',
                division_id: initialData.division_id || '',
                range_id: initialData.range_id || '',
                beat_id: initialData.beat_id || '',
                latitude: initialData.latitude?.toString() || '',
                longitude: initialData.longitude?.toString() || '',
                notes: initialData.notes || '',
                status: initialData.status || 'active',
            });
            // Trigger cascades if IDs exist
            if (initialData.circle_id) fetchDivisions(initialData.circle_id);
            if (initialData.division_id) fetchRanges(initialData.division_id);
            if (initialData.range_id) fetchBeats(initialData.range_id);
        } else {
            setFormData({
                camera_id: '',
                brand_id: '',
                camera_name: '',
                circle_id: '',
                division_id: '',
                range_id: '',
                beat_id: '',
                latitude: '',
                longitude: '',
                notes: '',
                status: 'active',
            });
            setRanges([]);
            setBeats([]);
        }
    }, [initialData]);

    const fetchBrands = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/brands', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBrands(data.brands || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

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
        } catch (err) {
            console.error('Failed to fetch circles:', err);
        }
    };

    const fetchDivisions = async (circleId?: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const url = circleId
                ? `/api/geography/divisions?circle_id=${circleId}`
                : '/api/geography/divisions';
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDivisions(data.divisions || []);
            }
        } catch (err) {
            console.error('Divisions fetch error:', err);
        }
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
            } else {
                setRanges([]);
            }
        } catch (err) {
            console.error('Ranges fetch error:', err);
            setRanges([]);
        }
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
        } catch (err) {
            console.error(err);
        }
    };

    const handleCircleChange = (circleId: string) => {
        setFormData(prev => ({ ...prev, circle_id: circleId, division_id: '', range_id: '', beat_id: '' }));
        setDivisions([]);
        setRanges([]);
        setBeats([]);
        if (circleId) fetchDivisions(circleId);
    };

    const handleDivisionChange = (divisionId: string) => {
        setFormData(prev => ({ ...prev, division_id: divisionId, range_id: '', beat_id: '' }));
        setRanges([]);
        setBeats([]);
        if (divisionId) fetchRanges(divisionId);
    };

    const handleRangeChange = (rangeId: string) => {
        setFormData(prev => ({ ...prev, range_id: rangeId, beat_id: '' }));
        setBeats([]);
        if (rangeId) fetchBeats(rangeId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!formData.brand_id || !formData.camera_name || !formData.beat_id || !formData.latitude || !formData.longitude) {
                alert('Please select brand, enter camera name, choose beat, and set latitude/longitude.');
                setLoading(false);
                return;
            }

            await onSubmit({
                ...formData,
                latitude: parseFloat(String(formData.latitude)),
                longitude: parseFloat(String(formData.longitude))
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="camera_name">Camera Name</Label>
                <Input
                    id="camera_name"
                    value={formData.camera_name}
                    onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
                    placeholder="e.g., North Gate Checkpoint Camera"
                    required
                />
                <p className="text-sm text-gray-500 mt-1">
                    Camera ID: <span className="font-semibold text-green-700">{cameraIdPreview}</span>
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="brand">Camera Brand</Label>
                    <select
                        id="brand"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.brand_id}
                        onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                        required
                    >
                        <option value="">Select Brand</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                        id="status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                    <Label>Camera Location</Label>
                    <button
                        type="button"
                        onClick={() => {
                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                        setFormData({
                                            ...formData,
                                            latitude: position.coords.latitude.toFixed(6),
                                            longitude: position.coords.longitude.toFixed(6)
                                        });
                                    },
                                    (error) => {
                                        alert('Error getting location: ' + error.message);
                                    }
                                );
                            } else {
                                alert('Geolocation is not supported by this browser.');
                            }
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        📍 Use Current Location
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Input
                            id="latitude"
                            type="number"
                            step="0.000001"
                            min="8"
                            max="37"
                            value={formData.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                            placeholder="Latitude (11.664509)"
                            required
                        />
                    </div>
                    <div>
                        <Input
                            id="longitude"
                            type="number"
                            step="0.000001"
                            min="68"
                            max="97"
                            value={formData.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                            placeholder="Longitude (76.627289)"
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="circle">Circle</Label>
                    <select
                        id="circle"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.circle_id}
                        onChange={(e) => handleCircleChange(e.target.value)}
                    >
                        <option value="">Select Circle</option>
                        {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <select
                        id="division"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.division_id}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        disabled={!formData.circle_id}
                    >
                        <option value="">Select Division</option>
                        {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="range">Range</Label>
                    <select
                        id="range"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.range_id}
                        onChange={(e) => handleRangeChange(e.target.value)}
                        disabled={!formData.division_id}
                    >
                        <option value="">Select Range</option>
                        {ranges.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="beat">Beat</Label>
                    <select
                        id="beat"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.beat_id}
                        onChange={(e) => setFormData({ ...formData, beat_id: e.target.value })}
                        disabled={!formData.range_id}
                    >
                        <option value="">Select Beat</option>
                        {beats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes/Description</Label>
                <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g., Bandipur North Gate Checkpost"
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (initialData ? 'Update Camera' : 'Add Camera')}
                </Button>
            </div>
        </form>
    );
}
