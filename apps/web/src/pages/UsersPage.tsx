import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Shield, User, Map, MapPin } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import UserForm from '@/components/UserForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AlertDialog from '@/components/ui/AlertDialog';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; variant: 'error' | 'success' }>({ isOpen: false, title: '', message: '', variant: 'error' });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const canManageUsers = currentUser.role !== 'Ground Staff';

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/users/roles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRoles(data.roles);
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        }
    };

    const handleCreate = async (data: any) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                await fetchUsers();
                setIsModalOpen(false);
                setAlert({ isOpen: true, title: 'Success', message: 'User created successfully', variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to create user', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingUser) return;
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                await fetchUsers();
                setIsModalOpen(false);
                setEditingUser(null);
                setAlert({ isOpen: true, title: 'Success', message: 'User updated successfully', variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to update user', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, userId: id });
    };

    const handleDelete = async () => {
        if (!deleteConfirm.userId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/users/${deleteConfirm.userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                await fetchUsers();
                setAlert({ isOpen: true, title: 'Success', message: 'User deleted successfully', variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to delete user', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user: any) => {
        // Need to map flattened user object to what form expects if structure differs
        // But get /users returns joined data.
        // We need role_id, which isn't in GET /users response by default?
        // Wait, GET /users query: SELECT u.id ... r.name as role_name.
        // It does NOT select u.role_id!
        // I need to update users.ts to return role_id!

        // Hack: find role_id from role_name
        const role: any = roles.find((r: any) => r.name === user.role_name);
        setEditingUser({ ...user, role_id: role?.id });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {loading ? 'Loading...' : `${users.length} active accounts`}
                    </p>
                </div>
                {canManageUsers && (
                    <Button onClick={openCreateModal} className="bg-green-700 hover:bg-green-800">
                        <Plus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Last Login</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user: any) => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{user.full_name}</div>
                                        <div className="text-gray-500 text-xs">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role_name === 'System Admin' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                <Shield size={12} className="mr-1" />
                                                {user.role_name}
                                            </span>
                                        )}
                                        {user.role_name === 'Admin' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                <Shield size={12} className="mr-1" />
                                                {user.role_name}
                                            </span>
                                        )}
                                        {user.role_name === 'Range Officer' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <MapPin size={12} className="mr-1" />
                                                {user.role_name}
                                            </span>
                                        )}
                                        {user.role_name === 'Divisional Officer' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                <MapPin size={12} className="mr-1" />
                                                {user.role_name}
                                            </span>
                                        )}
                                        {user.role_name === 'Beat Officer' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                <Map size={12} className="mr-1" />
                                                {user.role_name}
                                            </span>
                                        )}
                                        {user.role_name === 'Ground Staff' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                <User size={12} className="mr-1" />
                                                {user.role_name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        {canManageUsers && user.email !== 'admin@wildvision.gov.in' && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(user.id)}
                                                    className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                        {user.email === 'admin@wildvision.gov.in' && (
                                            <span className="text-xs text-gray-400 italic">Protected</span>
                                        )}
                                        {!canManageUsers && (
                                            <span className="text-xs text-gray-400 italic">View Only</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? 'Edit User' : 'Add New User'}
            >
                <UserForm
                    initialData={editingUser}
                    roles={roles}
                    onSubmit={editingUser ? handleUpdate : handleCreate}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, userId: null })}
                onConfirm={handleDelete}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
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
