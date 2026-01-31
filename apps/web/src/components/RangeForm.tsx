import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RangeFormProps {
    initialData?: any;
    divisions: any[];
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function RangeForm({ initialData, divisions, onSubmit, onCancel }: RangeFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        division_id: initialData?.division_id || '',
        area_sq_km: initialData?.area_sq_km || '',
        perimeter_km: initialData?.perimeter_km || '',
    });

    // Generate code preview
    const selectedDiv = divisions.find(d => d.id === formData.division_id);
    const codePreview = selectedDiv 
        ? `${selectedDiv.code}-RNG-##`
        : 'Select division';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Range Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Bandipur Range"
                    required
                />
                <p className="text-sm text-gray-500 mt-1">
                    Code: <span className="font-semibold text-green-700">{codePreview}</span>
                </p>
            </div>

            <div>
                <Label htmlFor="division_id">Division *</Label>
                <select
                    id="division_id"
                    value={formData.division_id}
                    onChange={(e) => setFormData({ ...formData, division_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                >
                    <option value="">Select Division</option>
                    {divisions.map((div: any) => (
                        <option key={div.id} value={div.id}>
                            {div.name} ({div.code})
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <Label htmlFor="area_sq_km">Area (sq km)</Label>
                <Input
                    id="area_sq_km"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.area_sq_km}
                    onChange={(e) => setFormData({ ...formData, area_sq_km: e.target.value })}
                    placeholder="e.g., 450.3000"
                />
            </div>

            <div>
                <Label htmlFor="perimeter_km">Perimeter (km)</Label>
                <Input
                    id="perimeter_km"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.perimeter_km}
                    onChange={(e) => setFormData({ ...formData, perimeter_km: e.target.value })}
                    placeholder="e.g., 85.2000"
                />
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" onClick={onCancel} variant="outline">
                    Cancel
                </Button>
                <Button type="submit">
                    {initialData ? 'Update' : 'Create'} Range
                </Button>
            </div>
        </form>
    );
}
