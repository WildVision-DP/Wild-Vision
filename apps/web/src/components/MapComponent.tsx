import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapComponentProps {
    cameras?: Array<{
        id: string;
        camera_id: string;
        latitude: number;
        longitude: number;
        status: string;
    }>;
    center?: { lat: number; lng: number };
    zoom?: number;
}

export default function MapComponent({
    cameras = [],
    center = { lat: 12.9716, lng: 77.5946 }, // Bangalore, India
    zoom = 6
}: MapComponentProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

    useEffect(() => {
        const initMap = async () => {
            const loader = new Loader({
                apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
                version: 'weekly',
                libraries: ['places', 'visualization'],
            });

            try {
                await loader.load();

                if (mapRef.current) {
                    const googleMap = new google.maps.Map(mapRef.current, {
                        center,
                        zoom,
                        mapTypeControl: true,
                        streetViewControl: false,
                        fullscreenControl: true,
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

                    setMap(googleMap);
                }
            } catch (error) {
                console.error('Error loading Google Maps:', error);
            }
        };

        initMap();
    }, [center, zoom]);

    useEffect(() => {
        if (!map) return;

        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));

        // Add new markers for cameras
        const newMarkers = cameras.map(camera => {
            const marker = new google.maps.Marker({
                position: { lat: camera.latitude, lng: camera.longitude },
                map,
                title: camera.camera_id,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: camera.status === 'active' ? '#22c55e' : '#ef4444',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${camera.camera_id}</h3>
            <p style="margin: 0; color: #666;">Status: ${camera.status}</p>
            <p style="margin: 0; color: #666;">Lat: ${camera.latitude.toFixed(6)}</p>
            <p style="margin: 0; color: #666;">Lng: ${camera.longitude.toFixed(6)}</p>
          </div>
        `,
            });

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            return marker;
        });

        setMarkers(newMarkers);
    }, [map, cameras]);

    return (
        <div className="w-full h-full">
            <div ref={mapRef} className="w-full h-full rounded-lg" />
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded">
                    Google Maps API key not configured
                </div>
            )}
        </div>
    );
}
