import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserFormProps {
    initialData?: any;
    roles: any[];
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

export default function UserForm({ initialData, roles, onSubmit, onCancel }: UserFormProps) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        roleId: '',
        isActive: true,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                email: initialData.email || '',
                password: '', // Don't show password
                fullName: initialData.full_name || '',
                roleId: initialData.role_id || '', // Note: API might need to return role_id
                isActive: initialData.is_active,
            });
        } else {
            // Default to first role (usually Admin or lowest level?)
            if (roles.length > 0) {
                setFormData(prev => ({ ...prev, roleId: roles[roles.length - 1].id }));
            }
        }
    }, [initialData, roles]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="officer@wildvision.gov.in"
                    required
                    disabled={!!initialData} // Email usually immutable or requires special flow
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Rajesh Kumar"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                    id="role"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    required
                >
                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                </select>
            </div>

            {!initialData && (
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min. 8 characters"
                        required
                    />
                </div>
            )}

            {initialData && (
                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password (optional)</Label>
                    <Input
                        id="newPassword"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave blank to keep current"
                    />
                </div>
            )}

            {initialData && (
                <div className="flex items-center space-x-2 pt-2">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                    />
                    <Label htmlFor="isActive">Active Account</Label>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (initialData ? 'Update User' : 'Create User')}
                </Button>
            </div>
        </form>
    );
}
