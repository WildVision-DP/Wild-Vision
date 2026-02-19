import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface CircleFormProps {
    circle?: any;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

export default function CircleForm({ circle, onSubmit, onCancel }: CircleFormProps) {
    const [formData, setFormData] = useState({
        name: circle?.name || '',
        area_sq_km: circle?.area_sq_km || '',
        perimeter_km: circle?.perimeter_km || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.name) {
            setError('Name is required');
            return;
        }

        // Validate area and perimeter if provided
        if (formData.area_sq_km && (isNaN(Number(formData.area_sq_km)) || Number(formData.area_sq_km) < 0)) {
            setError('Area must be a valid positive number');
            return;
        }

        if (formData.perimeter_km && (isNaN(Number(formData.perimeter_km)) || Number(formData.perimeter_km) < 0)) {
            setError('Perimeter must be a valid positive number');
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                ...formData,
                area_sq_km: formData.area_sq_km ? Number(formData.area_sq_km) : null,
                perimeter_km: formData.perimeter_km ? Number(formData.perimeter_km) : null,
            };
            await onSubmit(submitData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save circle');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError(null);
    };

    // Generate code preview (like Range/Beat forms)
    const words = formData.name.trim().split(/\s+/).filter((w: string) => w.length > 0);
    let codePreview = 'Enter name';
    if (words.length >= 2) {
        const base = (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase().replace(/[^A-Z]/g, '');
        codePreview = base || 'CIR';
    } else if (words.length === 1) {
        codePreview = words[0].substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'CIR';
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Circle Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Karnataka Circle"
                    required
                    disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">
                    Code: <span className="font-semibold text-green-700">{codePreview}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="area_sq_km">Area (sq km)</Label>
                    <Input
                        id="area_sq_km"
                        type="number"
                        step="0.01"
                        value={formData.area_sq_km}
                        onChange={(e) => handleChange('area_sq_km', e.target.value)}
                        placeholder="e.g., 1500.25"
                        disabled={loading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="perimeter_km">Perimeter (km)</Label>
                    <Input
                        id="perimeter_km"
                        type="number"
                        step="0.01"
                        value={formData.perimeter_km}
                        onChange={(e) => handleChange('perimeter_km', e.target.value)}
                        placeholder="e.g., 245.50"
                        disabled={loading}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            <div className="flex gap-3 pt-4">
                <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                >
                    {loading ? 'Saving...' : (circle ? 'Update Circle' : 'Create Circle')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}
