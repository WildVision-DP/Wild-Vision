import { useEffect, useState } from 'react';
import MapComponent from '../components/MapComponent';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PawPrint, Video, RefreshCw } from 'lucide-react';

type Camera = {
    id: string;
    camera_id: string;
    latitude: number;
    longitude: number;
    status: string;
    notes?: string;
    division_name?: string;
    range_name?: string;
};

type Animal = {
    id: string;
    name: string;
    species: string;
    latitude: number;
    longitude: number;
    status?: 'active' | 'resting' | 'unknown';
    last_seen?: string;
};

// Simple demo animal sightings around Bandipur
const demoAnimals: Animal[] = [
    {
        id: 'a1',
        name: 'Collared Tiger T‑01',
        species: 'Bengal Tiger',
        latitude: 11.8082,
        longitude: 76.6015,
        status: 'active',
        last_seen: '5 min ago',
    },
    {
        id: 'a2',
        name: 'Elephant Herd E‑07',
        species: 'Asian Elephant',
        latitude: 11.7405,
        longitude: 76.4955,
        status: 'resting',
        last_seen: '18 min ago',
    },
    {
        id: 'a3',
        name: 'Leopard L‑03',
        species: 'Indian Leopard',
        latitude: 11.6958,
        longitude: 76.5335,
        status: 'unknown',
        last_seen: '42 min ago',
    },
];

export default function WildlifeMapPage() {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCameras = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch('http://localhost:4000/cameras', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setCameras(data.cameras || []);
                }
            } catch (e) {
                console.error('WildlifeMapPage: failed to load cameras', e);
            } finally {
                setLoading(false);
            }
        };

        fetchCameras();
    }, []);

    return (
        <div className="p-6 h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <PawPrint className="w-6 h-6 text-green-700" />
                        Wildlife Activity Map
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Live camera network with recent animal sightings around the park.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 flex-1 min-h-[500px]">
                <Card className="relative overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Video className="w-4 h-4 text-green-600" />
                            <span>Camera & Animal Overlay</span>
                        </div>
                        <div className="text-xs text-gray-500">
                            {loading
                                ? 'Loading cameras...'
                                : `${cameras.length} cameras · ${demoAnimals.length} animal sightings`}
                        </div>
                    </div>
                    <div className="flex-1">
                        <MapComponent cameras={cameras} animals={demoAnimals} />
                    </div>
                </Card>

                <div className="space-y-4">
                    <Card className="p-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3">
                            Legend
                        </h2>
                        <div className="space-y-2 text-xs text-gray-700">
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                                <span>Active camera</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
                                <span>Maintenance camera</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                                <span>Offline camera</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-block w-3 h-3 border-2 border-slate-900 bg-sky-400 rotate-45" />
                                <span>Animal sighting</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 max-h-[340px] overflow-auto">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <PawPrint className="w-4 h-4 text-green-700" />
                            Recent animal sightings
                        </h2>
                        <div className="space-y-2 text-xs">
                            {demoAnimals.map((a) => (
                                <div
                                    key={a.id}
                                    className="border rounded-md px-3 py-2 hover:bg-gray-50 cursor-default"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="font-semibold text-gray-900">
                                            {a.name}
                                        </div>
                                        <span className="text-[10px] text-gray-500">
                                            {a.last_seen}
                                        </span>
                                    </div>
                                    <div className="text-gray-600 mt-0.5">
                                        {a.species}
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-1 font-mono">
                                        {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
