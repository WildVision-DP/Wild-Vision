import { useEffect, useRef, useState, useCallback } from 'react';
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
    const [mapFallback, setMapFallback] = useState(false);
    const mapInitializedRef = useRef(false);

    const initMap = useCallback(async () => {
        if (mapInitializedRef.current || !mapRef.current) return;

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        console.log('Initializing Google Maps...');
        console.log('API Key present:', !!apiKey);
        
        if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
            console.warn('Google Maps API key not properly configured, using fallback');
            setMapFallback(true);
            setLoading(false);
            return;
        }

        try {
            mapInitializedRef.current = true;
            
            const loader = new Loader({
                apiKey,
                version: 'weekly',
                libraries: ['maps'],
                region: 'IN',
                language: 'en'
            });

            console.log('Loading Google Maps API...');
            
            // Set a timeout for API loading
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Google Maps API loading timeout')), 10000);
            });

            await Promise.race([
                loader.importLibrary('maps'),
                timeoutPromise
            ]);
            
            console.log('Google Maps API loaded successfully');

            if (mapRef.current) {
                console.log('Creating map instance...');
                const googleMap = new google.maps.Map(mapRef.current, {
                    center,
                    zoom,
                    mapTypeControl: true,
                    streetViewControl: false,
                    fullscreenControl: true,
                    mapTypeId: 'terrain',
                    gestureHandling: 'cooperative',
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

                // Wait for map to be fully initialized
                google.maps.event.addListenerOnce(googleMap, 'idle', () => {
                    console.log('Map fully loaded and ready');
                    setMap(googleMap);
                    setLoading(false);
                });

                // Handle map errors
                google.maps.event.addListener(googleMap, 'error', (error: any) => {
                    console.error('Google Maps error:', error);
                    setMapFallback(true);
                    setLoading(false);
                });
            }
        } catch (error) {
            console.error('Error loading Google Maps:', error);
            console.warn('Falling back to static map view');
            setMapFallback(true);
            setLoading(false);
            mapInitializedRef.current = false;
        }
    }, [center, zoom]);

    useEffect(() => {
        initMap();
    }, [initMap]);

    useEffect(() => {
        if (!map || mapFallback) return;

        // Clear existing markers
        markers.forEach(marker => marker.setMap(null));

        if (cameras.length === 0) {
            setMarkers([]);
            return;
        }

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
                    scale: 12,
                    fillColor: camera.status === 'active' ? '#22c55e' : 
                               camera.status === 'maintenance' ? '#eab308' : '#ef4444',
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                },
                animation: google.maps.Animation.DROP,
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 12px; min-width: 220px; font-family: system-ui, sans-serif;">
                        <h3 style="font-weight: 600; margin: 0 0 8px 0; color: #111; font-size: 16px;">${camera.camera_id}</h3>
                        <div style="font-size: 13px; color: #555; line-height: 1.5;">
                            <div style="margin: 4px 0;"><strong>Status:</strong> 
                                <span style="color: ${camera.status === 'active' ? '#22c55e' : camera.status === 'maintenance' ? '#eab308' : '#ef4444'}; font-weight: 500;">
                                    ${camera.status.toUpperCase()}
                                </span>
                            </div>
                            ${camera.division_name ? `<div style="margin: 4px 0;"><strong>Division:</strong> ${camera.division_name}</div>` : ''}
                            ${camera.range_name ? `<div style="margin: 4px 0;"><strong>Range:</strong> ${camera.range_name}</div>` : ''}
                            ${camera.notes ? `<div style="margin: 4px 0;"><strong>Notes:</strong> ${camera.notes}</div>` : ''}
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 11px; color: #888;">
                                📍 ${camera.latitude.toFixed(6)}, ${camera.longitude.toFixed(6)}
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

        // Fit map to show all markers with some delay to ensure markers are rendered
        setTimeout(() => {
            if (cameras.length > 0) {
                try {
                    map.fitBounds(bounds);
                    const padding = { top: 60, right: 60, bottom: 60, left: 60 };
                    map.fitBounds(bounds, padding);
                    
                    // Ensure minimum zoom level
                    const maxZoom = 15;
                    const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
                        if (map.getZoom()! > maxZoom) map.setZoom(maxZoom);
                        google.maps.event.removeListener(listener);
                    });
                } catch (e) {
                    console.warn('Error fitting bounds:', e);
                }
            }
        }, 100);
    }, [map, cameras, mapFallback, markers]);

    // Static fallback map component
    const StaticMapFallback = () => (
        <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="grid grid-cols-8 gap-4 h-full p-4">
                    {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className="bg-green-200 rounded-sm opacity-30"></div>
                    ))}
                </div>
            </div>
            
            <div className="absolute inset-0 flex flex-col">
                <div className="bg-white/90 backdrop-blur-sm border-b border-green-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Camera Locations</h3>
                            <p className="text-sm text-gray-600">Interactive map temporarily unavailable</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 p-4 overflow-auto">
                    {cameras.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-500">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p>No cameras deployed</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {cameras.map((camera) => (
                                <div key={camera.id} className="bg-white/80 backdrop-blur-sm rounded-lg border border-white/50 p-4 hover:bg-white/90 transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-3 h-3 rounded-full mt-2 ${
                                            camera.status === 'active' ? 'bg-green-500' :
                                            camera.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-900 truncate">{camera.camera_id}</h4>
                                            <p className={`text-xs font-medium mt-1 ${
                                                camera.status === 'active' ? 'text-green-600' :
                                                camera.status === 'maintenance' ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                                {camera.status.toUpperCase()}
                                            </p>
                                            {(camera.division_name || camera.range_name) && (
                                                <p className="text-xs text-gray-600 mt-1 truncate">
                                                    {[camera.division_name, camera.range_name].filter(Boolean).join(' → ')}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2 font-mono">
                                                📍 {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="bg-yellow-50/90 backdrop-blur-sm border-t border-yellow-200 p-3">
                    <div className="flex items-center gap-2 text-sm text-yellow-800">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.312 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span>Map service temporarily unavailable. Showing camera list instead.</span>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                <div className="text-center">
                    <div className="relative">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mb-4"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-gray-700 font-medium">Loading surveillance map...</p>
                    <p className="text-gray-500 text-sm mt-1">Initializing camera locations</p>
                </div>
            </div>
        );
    }

    if (error || mapFallback) {
        return <StaticMapFallback />;
    }

    return (
        <div className="w-full h-full relative">
            <div ref={mapRef} className="w-full h-full" />
            {cameras.length === 0 && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center max-w-sm mx-4">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cameras Deployed</h3>
                        <p className="text-gray-600 text-sm">Add camera units to see them on the map</p>
                    </div>
                </div>
            )}
        </div>
    );
}
