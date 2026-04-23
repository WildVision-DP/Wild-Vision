import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LogOut, Map, LayoutDashboard, User, MapPin, Shield, Upload, File, BarChart3 } from 'lucide-react';

export default function Layout() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="text-3xl">🐅</span>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">WildVision</h1>
                            <p className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">Forest Dept.</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-medium text-gray-900">{user.fullName || 'User'}</span>
                            {user.role === 'System Admin' && (
                                <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <Shield size={10} /> {user.role}
                                </span>
                            )}
                            {user.role === 'Admin' && (
                                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <Shield size={10} /> {user.role}
                                </span>
                            )}
                            {user.role === 'Range Officer' && (
                                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <MapPin size={10} /> {user.role}
                                </span>
                            )}
                            {user.role === 'Divisional Officer' && (
                                <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <MapPin size={10} /> {user.role}
                                </span>
                            )}
                            {user.role === 'Beat Officer' && (
                                <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <Map size={10} /> {user.role}
                                </span>
                            )}
                            {user.role === 'Ground Staff' && (
                                <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <User size={10} /> {user.role}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">

                {/* Sidebar Navigation */}
                <aside className="w-64 flex-shrink-0 hidden md:block">
                    <nav className="space-y-1">
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <LayoutDashboard size={20} />
                            <span>Dashboard</span>
                        </NavLink>

                        <NavLink
                            to="/cameras"
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <Map size={20} />
                            <span>Cameras</span>
                        </NavLink>

                        <NavLink
                            to="/geography"
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <MapPin size={20} />
                            <span>Areas</span>
                        </NavLink>

                        <NavLink
                            to="/users"
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <User size={20} />
                            <span>Users</span>
                        </NavLink>
                        <NavLink
                            to="/upload"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`
                            }
                        >
                            <Upload className="h-5 w-5" />
                            <span>Upload Data</span>
                        </NavLink>

                        <NavLink
                            to="/map"
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <Map size={20} />
                            <span>Wildlife Map</span>
                        </NavLink>

                        <NavLink
                            to="/activity-log"
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <File size={20} />
                            <span>Activity Log</span>
                        </NavLink>

                        <NavLink
                            to="/analytics"
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <BarChart3 size={20} />
                            <span>Analytics</span>
                        </NavLink>
                    </nav>

                    <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">System Status</h4>
                        <div className="flex items-center space-x-2 text-sm text-amber-900">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>System Online</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-2">v0.2.0 Beta</p>
                    </div>
                </aside>

                {/* Page Content */}
                <main className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
