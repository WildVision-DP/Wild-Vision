import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapComponentProps {
    cameras?: Array<{
        id: string;
        camera_id: string;
        latitude: number;
        longitude: number;
        status: string;
        notes?: string;
        division_name?: string;
        range_name?: string;
    }>;
    center?: { lat: number; lng: number };
    zoom?: number;
}

export default function MapComponent({
    cameras = [],
    center = { lat: 11.8, lng: 76.6 }, // Bandipur area
    zoom = 10
}: MapComponentProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initMap = async () => {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            console.log('Initializing Google Maps...');
            console.log('API Key present:', !!apiKey);
            console.log('API Key value:', apiKey); // Debug log
            
            if (!apiKey) {
                console.error('No Google Maps API key found');
                setError('Google Maps API key not configured');
                setLoading(false);
                return;
            }

            const loader = new Loader({
                apiKey,
                version: 'weekly',
                libraries: []
            });

            try {
                console.log('Loading Google Maps API...');
                const google = await loader.load();
                console.log('Google Maps API loaded successfully');

                if (mapRef.current && !map) {
                    console.log('Creating map instance...');
                    const googleMap = new google.maps.Map(mapRef.current, {
                        center,
                        zoom,
                        mapTypeControl: true,
                        streetViewControl: false,
                        fullscreenControl: true,
                        mapTypeId: 'terrain',
                        styles: [
                            {
                                featureType: 'poi',
                                elementType: 'labels',
                                stylers: [{ visibility: 'off' }],
                            },
                            {
                                featureType: 'landscape.natural',
                                elementType: 'geometry',
                                stylers: [{ color: '#e8f5e9' }],
                            },
                        ],
                    });

                    console.log('Map instance created successfully');
                    setMap(googleMap);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error loading Google Maps:', error);
                setError('Failed to load Google Maps: ' + (error as Error).message);
                setLoading(false);
            }
        };

        initMap();
    }, []);

    useEffect(() => {
        if (!map) return;

        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));

        // Calculate bounds to fit all cameras
        const bounds = new google.maps.LatLngBounds();

        // Add new markers for cameras
        const newMarkers = cameras.map(camera => {
            const position = { lat: camera.latitude, lng: camera.longitude };
            bounds.extend(position);

            const marker = new google.maps.Marker({
                position,
                map,
                title: camera.camera_id,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: camera.status === 'active' ? '#22c55e' : 
                               camera.status === 'maintenance' ? '#eab308' : '#ef4444',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px; min-width: 200px;">
                        <h3 style="font-weight: bold; margin: 0 0 8px 0; color: #111;">${camera.camera_id}</h3>
                        <div style="font-size: 13px; color: #666; line-height: 1.6;">
                            <div><strong>Status:</strong> <span style="color: ${camera.status === 'active' ? '#22c55e' : '#ef4444'}">${camera.status}</span></div>
                            ${camera.division_name ? `<div><strong>Division:</strong> ${camera.division_name}</div>` : ''}
                            ${camera.range_name ? `<div><strong>Range:</strong> ${camera.range_name}</div>` : ''}
                            ${camera.notes ? `<div><strong>Notes:</strong> ${camera.notes}</div>` : ''}
                            <div style="margin-top: 6px; font-size: 11px; color: #999;">
                                ${camera.latitude.toFixed(6)}, ${camera.longitude.toFixed(6)}
                            </div>
                        </div>
                    </div>
                `,
            });

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            return marker;
        });

        setMarkers(newMarkers);

        // Fit map to show all markers
        if (cameras.length > 0) {
            map.fitBounds(bounds);
            // Add some padding
            const padding = { top: 50, right: 50, bottom: 50, left: 50 };
            map.fitBounds(bounds, padding);
        }
    }, [map, cameras]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mb-2"></div>
                    <p className="text-gray-600">Loading map...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full bg-gray-50 p-6 overflow-auto">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <h3 className="text-sm font-semibold text-red-900">Map Error</h3>
                        <p className="text-xs text-red-700 mt-1">{error}</p>
                        <div className="mt-2 text-xs text-red-600">
                            <p className="font-medium">Troubleshooting:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Check browser console for detailed errors</li>
                                <li>Verify Google Maps JavaScript API is enabled</li>
                                <li>Check API key has no restrictions or correct restrictions</li>
                                <li>Ensure billing is enabled in Google Cloud</li>
                            </ul>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Camera Locations ({cameras.length})</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {cameras.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-500">No cameras</div>
                            ) : (
                                cameras.map((cam) => (
                                    <div key={cam.id} className="px-6 py-4 hover:bg-gray-50">
                                        <div className="font-semibold text-gray-900">{cam.camera_id}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            Status: <span className={cam.status === 'active' ? 'text-green-600' : 'text-red-600'}>{cam.status}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {cam.latitude.toFixed(6)}, {cam.longitude.toFixed(6)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <div ref={mapRef} className="w-full h-full" />;
}
