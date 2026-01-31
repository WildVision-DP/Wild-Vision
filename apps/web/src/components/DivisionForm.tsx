import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DivisionFormProps {
    initialData?: any;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function DivisionForm({ initialData, onSubmit, onCancel }: DivisionFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        circle_id: initialData?.circle_id || '',
        area_sq_km: initialData?.area_sq_km || '',
        perimeter_km: initialData?.perimeter_km || '',
    });

    // Generate code preview from name
    const codePreview = formData.name 
        ? formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'N/A'
        : 'Enter name to see code';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Division Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Bandipur"
                    required
                />
                <p className="text-sm text-gray-500 mt-1">
                    Code: <span className="font-semibold text-green-700">{codePreview}</span>
                </p>
            </div>

            <div>
                <Label htmlFor="circle_id">Circle ID</Label>
                <Input
                    id="circle_id"
                    value={formData.circle_id}
                    onChange={(e) => setFormData({ ...formData, circle_id: e.target.value })}
                    placeholder="Optional"
                />
            </div>

            <div>
                <Label htmlFor="area_sq_km">Area (sq km)</Label>
                <Input
                    id="area_sq_km"
                    type="number"
                    step="0.01"
                    value={formData.area_sq_km}
                    onChange={(e) => setFormData({ ...formData, area_sq_km: e.target.value })}
                    placeholder="e.g., 874.20"
                />
            </div>

            <div>
                <Label htmlFor="perimeter_km">Perimeter (km)</Label>
                <Input
                    id="perimeter_km"
                    type="number"
                    step="0.01"
                    value={formData.perimeter_km}
                    onChange={(e) => setFormData({ ...formData, perimeter_km: e.target.value })}
                    placeholder="e.g., 120.50"
                />
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" onClick={onCancel} variant="outline">
                    Cancel
                </Button>
                <Button type="submit">
                    {initialData ? 'Update' : 'Create'} Division
                </Button>
            </div>
        </form>
    );
}
