import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DivisionFormProps {
    initialData?: any;
    circles?: any[];
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function DivisionForm({ initialData, circles = [], onSubmit, onCancel }: DivisionFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        circle_id: initialData?.circle_id || '',
        area_sq_km: initialData?.area_sq_km || '',
        perimeter_km: initialData?.perimeter_km || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.circle_id) {
            alert('Please fill in all required fields');
            return;
        }
        const submitData = {
            ...formData,
            area_sq_km: formData.area_sq_km ? Number(formData.area_sq_km) : null,
            perimeter_km: formData.perimeter_km ? Number(formData.perimeter_km) : null,
        };
        onSubmit(submitData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Division Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Bandipur Tiger Reserve"
                    required
                />
                <p className="text-sm text-gray-500 mt-1">
                    Code: <span className="font-semibold text-green-700">
                        {initialData?.code || (formData.name ? 'Auto-generated from name' : 'Enter name')}
                    </span>
                </p>
            </div>

            <div>
                <Label htmlFor="circle_id">Circle *</Label>
                <select
                    id="circle_id"
                    value={formData.circle_id}
                    onChange={(e) => setFormData({ ...formData, circle_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                >
                    <option value="">Select Circle</option>
                    {circles.map((circle: any) => (
                        <option key={circle.id} value={circle.id}>
                            {circle.name} ({circle.code})
                        </option>
                    ))}
                </select>
            </div>

            <div>
            <div>
                <Label htmlFor="area_sq_km">Area (sq km)</Label>
                <Input
                    id="area_sq_km"
                    type="number"
                    step="0.0001"
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
                    step="0.0001"
                    value={formData.perimeter_km}
                    onChange={(e) => setFormData({ ...formData, perimeter_km: e.target.value })}
                    placeholder="e.g., 120.50"
                />
            </div>
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
