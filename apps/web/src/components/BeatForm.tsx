import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BeatFormProps {
    initialData?: any;
    ranges: any[];
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function BeatForm({ initialData, ranges, onSubmit, onCancel }: BeatFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        range_id: initialData?.range_id || '',
        area_sq_km: initialData?.area_sq_km || '',
        perimeter_km: initialData?.perimeter_km || '',
    });

    // Generate code preview
    const selectedRange = ranges.find(r => r.id === formData.range_id);
    const codePreview = selectedRange 
        ? `${selectedRange.code}-BT##`
        : 'Select range';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Beat Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mangala Beat"
                    required
                />
                <p className="text-sm text-gray-500 mt-1">
                    Code: <span className="font-semibold text-green-700">{codePreview}</span>
                </p>
            </div>

            <div>
                <Label htmlFor="range_id">Range *</Label>
                <select
                    id="range_id"
                    value={formData.range_id}
                    onChange={(e) => setFormData({ ...formData, range_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                >
                    <option value="">Select Range</option>
                    {ranges.map((range: any) => (
                        <option key={range.id} value={range.id}>
                            {range.name} ({range.code})
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <Label htmlFor="area_sq_km">Area (sq km)</Label>
                <Input
                    id="area_sq_km"
                    type="number"
                    step="0.01"
                    value={formData.area_sq_km}
                    onChange={(e) => setFormData({ ...formData, area_sq_km: e.target.value })}
                    placeholder="e.g., 120.50"
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
                    placeholder="e.g., 42.30"
                />
            </div>

            <div className="flex gap-2 justify-end">
                <Button type="button" onClick={onCancel} variant="outline">
                    Cancel
                </Button>
                <Button type="submit">
                    {initialData ? 'Update' : 'Create'} Beat
                </Button>
            </div>
        </form>
    );
}
