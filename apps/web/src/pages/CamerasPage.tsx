import { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';

export default function CamerasPage() {
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCameras();
    }, []);

    const fetchCameras = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/cameras', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCameras(data.cameras);
            }
        } catch (error) {
            console.error('Failed to fetch cameras:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">Camera Locations</h1>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold">Camera Map</h2>
                            <p className="text-sm text-gray-600">
                                {loading ? 'Loading cameras...' : `${cameras.length} cameras found`}
                            </p>
                        </div>
                    </div>
                    <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200">
                        <MapComponent cameras={cameras} />
                    </div>
                </div>
            </main>
        </div>
    );
}
