import { useState, useEffect } from 'react';
import { Camera, MapPin } from 'lucide-react';
import MapComponent from '../components/MapComponent';

export default function DashboardPage() {
    const [cameraStats, setCameraStats] = useState({ active: 0, inactive: 0, maintenance: 0, total: 0 });
    const [geographyStats, setGeographyStats] = useState({ divisions: 0, ranges: 0, beats: 0 });
    const [cameras, setCameras] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            console.log('Dashboard: Token exists:', !!token);
            
            if (!token) {
                console.error('Dashboard: No auth token found, redirecting to login');
                window.location.href = '/';
                return;
            }

            const headers = { 'Authorization': `Bearer ${token}` };
            console.log('Dashboard: Making API calls...');

            const [camerasRes, divisionsRes, rangesRes, beatsRes] = await Promise.all([
                fetch('http://localhost:4000/cameras', { headers }),
                fetch('http://localhost:4000/geography/divisions', { headers }),
                fetch('http://localhost:4000/geography/ranges', { headers }),
                fetch('http://localhost:4000/geography/beats', { headers })
            ]);

            console.log('Dashboard: API responses:', {
                cameras: camerasRes.status,
                divisions: divisionsRes.status,
                ranges: rangesRes.status,
                beats: beatsRes.status
            });

            // Check for auth failure
            if (!camerasRes.ok && camerasRes.status === 401) {
                console.error('Dashboard: Auth failed, redirecting to login');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            if (camerasRes.ok) {
                const data = await camerasRes.json();
                const cameras = data.cameras || [];
                console.log('Dashboard: Cameras loaded:', cameras.length);
                setCameras(cameras);
                setCameraStats({
                    total: cameras.length,
                    active: cameras.filter(c => c.status === 'active').length,
                    inactive: cameras.filter(c => c.status === 'inactive').length,
                    maintenance: cameras.filter(c => c.status === 'maintenance').length
                });
            } else {
                console.error('Dashboard: Failed to fetch cameras:', await camerasRes.text());
            }

            if (divisionsRes.ok && rangesRes.ok && beatsRes.ok) {
                const [divData, rangeData, beatData] = await Promise.all([
                    divisionsRes.json(),
                    rangesRes.json(),
                    beatsRes.json()
                ]);
                console.log('Dashboard: Geography loaded:', {
                    divisions: divData.divisions?.length,
                    ranges: rangeData.ranges?.length,
                    beats: beatData.beats?.length
                });
                setGeographyStats({
                    divisions: (divData.divisions || []).length,
                    ranges: (rangeData.ranges || []).length,
                    beats: (beatData.beats || []).length
                });
            } else {
                console.error('Dashboard: Failed to fetch geography data');
            }
        } catch (error) {
            console.error('Dashboard: Failed to fetch data:', error);
            
            // If it's a network error, might be API server down
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('Dashboard: API server appears to be down');
                setError('Unable to connect to server. Please ensure the API server is running.');
            } else {
                console.error('Dashboard: Unexpected error:', error);
                setError('Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-900 font-semibold">Error Loading Dashboard</h3>
                    <p className="text-red-700 mt-1">{error}</p>
                    <button 
                        onClick={() => {
                            setError(null);
                            setLoading(true);
                            fetchDashboardData();
                        }}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
                <p className="text-gray-500">Welcome back, {user.fullName}</p>
            </div>



            {/* Camera Statistics - Single Block with White Background */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Camera className="w-8 h-8 text-green-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Camera Network</h3>
                </div>
                <div className="grid grid-cols-4 gap-6">
                    <div className="relative p-6 bg-green-50 border border-green-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <Camera className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-green-700">Total Cameras</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-green-800">{cameraStats.total}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-emerald-50 border border-emerald-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-emerald-700">Active & Recording</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-emerald-800">{cameraStats.active}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full opacity-50"></div>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-gray-700">Offline</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-gray-800">{cameraStats.inactive}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-amber-50 border border-amber-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-amber-700">Under Repair</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-amber-800">{cameraStats.maintenance}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Geography Coverage - Full Width */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-8 h-8 text-blue-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Area Coverage</h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="relative p-6 bg-green-50 border border-green-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-bold">D</span>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-green-700">Administrative Divisions</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-green-800">{geographyStats.divisions}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-blue-50 border border-blue-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-bold">R</span>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-blue-700">Forest Ranges Covered</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-blue-800">{geographyStats.ranges}</div>
                        </div>
                    </div>
                    <div className="relative p-6 bg-purple-50 border border-purple-200 rounded-xl hover:shadow-md transition-shadow duration-200">
                        <div className="absolute top-4 right-4">
                            <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-sm font-bold">B</span>
                            </div>
                        </div>
                        <div className="text-left mb-8">
                            <div className="text-sm font-medium text-purple-700">Beat Areas Monitored</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-purple-800">{geographyStats.beats}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Camera Map */}
            <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="w-8 h-8 text-blue-700" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Camera Network Map</h3>
                </div>
                <div className="h-96 rounded-lg border border-gray-200 overflow-hidden">
                    <MapComponent cameras={cameras} />
                </div>
            </div>
        </div>
    );
}
