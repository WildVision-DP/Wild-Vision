import { useEffect, useRef, useState, useCallback } from 'react';
import {
    getDetectionReviewStatus,
    isAutoApprovedDetection,
    normalizeConfidence,
} from '@/utils/detections';

interface CameraAnalytics {
    camera: {
        id: string;
        camera_id: string;
        camera_name: string;
        status: string;
    };
    analytics: {
        timeframe_days: number;
        total_detections: number;
        confirmed_detections: number;
        pending_detections: number;
        rejected_detections: number;
        average_confidence: number;
        last_detection: string | null;
        animals: Array<{
            name: string;
            scientific_name: string;
            count: number;
            avg_confidence: number;
            last_seen: string;
        }>;
        approval_breakdown: {
            total_approved: number;
            auto_approved: number;
            manual_approved: number;
        };
    };
}

interface MapComponentProps {
    cameras?: Array<{
        id: string;
        camera_id: string;
        camera_name: string;
        latitude: number;
        longitude: number;
        status: string;
        notes?: string;
        division_name?: string;
        range_name?: string;
    }>;
    animals?: Array<{
        id: string;
        name: string;
        species: string;
        latitude: number;
        longitude: number;
        status?: 'active' | 'resting' | 'unknown';
        last_seen?: string;
    }>;
    detections?: Array<{
        id: string;
        detected_animal: string;
        detected_animal_scientific: string;
        detection_confidence: number;
        auto_approved?: boolean;
        approval_method?: string | null;
        confirmation_status?: 'pending_confirmation' | 'confirmed' | 'rejected';
        detection_status?: 'auto_approved' | 'manual_approved' | 'pending_review' | 'rejected';
        latitude?: number;
        longitude?: number;
        camera_latitude?: number;
        camera_longitude?: number;
        thumbnail_path?: string;
        taken_at?: string;
    }>;
    center?: { lat: number; lng: number };
    zoom?: number;
}

export default function MapComponent({
    cameras = [],
    animals = [],
    detections = [],
    center = { lat: 11.8, lng: 76.6 }, // Bandipur area
    zoom = 10
}: MapComponentProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapFallback, setMapFallback] = useState(false);
    const mapInitializedRef = useRef(false);
    const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const [cameraAnalytics, setCameraAnalytics] = useState<Record<string, CameraAnalytics | null>>({});

    // Fetch camera analytics
    const fetchCameraAnalytics = useCallback(async (cameraId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/cameras/${cameraId}/analytics?timeframe=30`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn(`Failed to fetch analytics for camera ${cameraId}`);
                return null;
            }

            const data: CameraAnalytics = await response.json();
            setCameraAnalytics(prev => ({ ...prev, [cameraId]: data }));
            return data;
        } catch (err) {
            console.error(`Error fetching analytics for camera ${cameraId}:`, err);
            return null;
        }
    }, []);

    const initMap = useCallback(async () => {
        // Only guard against double‑init; the ref should be ready
        if (mapInitializedRef.current) return;

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
        
        console.log('Initializing Google Maps...');
        console.log('API Key present:', !!apiKey);
        console.log('Map ID present:', !!mapId);

        if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
            console.warn('Google Maps API key is missing or placeholder.');
            setError('Google Maps is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
            setLoading(false);
            return;
        }

        try {
            mapInitializedRef.current = true;

            console.log('Loading Google Maps API...');

            // Safety timeout so we never get stuck on the loading screen
            const timeoutId = setTimeout(() => {
                console.warn('Google Maps API loading timeout – showing fallback view instead of spinner.');
                setMapFallback(true);
                setLoading(false);
            }, 10000); // 10 seconds hard cap

            // Load Google Maps script directly
            // Include mapId in URL if available for Advanced Markers support
            const script = document.createElement('script');
            let scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&region=IN&language=en&v=weekly`;
            if (mapId) {
                scriptUrl += `&map_ids=${mapId}`;
            }
            script.src = scriptUrl;
            script.async = true;
            script.defer = true;

            await new Promise<void>((resolve, reject) => {
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load Google Maps script'));
                document.head.appendChild(script);
            });

            console.log('Google Maps API loaded successfully');

            if (mapRef.current) {
                console.log('Creating map instance...');
                const mapOptions: google.maps.MapOptions = {
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
                };

                // Add mapId if available (required for Advanced Markers)
                if (mapId) {
                    (mapOptions as any).mapId = mapId;
                }

                const googleMap = new google.maps.Map(mapRef.current, mapOptions);

                // Wait for map to be fully initialized
                google.maps.event.addListenerOnce(googleMap, 'idle', () => {
                    console.log('Map fully loaded and ready');
                    if (mapId) {
                        console.log('Advanced Markers enabled with Map ID');
                    } else {
                        console.log('Map initialized - Advanced Markers disabled (no Map ID available)');
                    }
                    clearTimeout(timeoutId);
                    setMap(googleMap);
                    setLoading(false);
                });
            }
        } catch (error) {
            console.error('Error loading Google Maps:', error);
            console.warn('Falling back to static map view');
            setError('Unable to load interactive map. Showing fallback view instead.');
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
        markersRef.current.forEach((marker: any) => {
            if (marker.map !== undefined) {
                marker.map = null;
            }
        });
        markersRef.current = [];

        const hasMapId = !!import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
        const hasCameras = cameras.length > 0;
        const hasAnimals = animals.length > 0;

        if (!hasCameras && !hasAnimals) {
            return;
        }

        // Calculate bounds to fit all entities
        const bounds = new google.maps.LatLngBounds();

        // Add markers for cameras
        cameras.forEach((camera) => {
            const position = { lat: camera.latitude, lng: camera.longitude };
            bounds.extend(position);

            // Status-based colors for pin
            const statusColor = camera.status === 'active' ? '#22c55e' :
                camera.status === 'maintenance' ? '#eab308' : '#ef4444';

            let marker: any;

            if (hasMapId && google.maps.marker?.AdvancedMarkerElement) {
                // Use Advanced Markers if Map ID is available
                const pinElement = new google.maps.marker.PinElement({
                    background: statusColor,
                    borderColor: '#ffffff',
                    glyphColor: '#ffffff',
                    scale: 1.4,
                });

                marker = new google.maps.marker.AdvancedMarkerElement({
                    position,
                    map,
                    title: camera.camera_id,
                    content: pinElement.element,
                });
            } else {
                // Fallback to basic Marker API
                marker = new google.maps.Marker({
                    position,
                    map,
                    title: camera.camera_id,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: statusColor,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                });
            }

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 0; min-width: 320px; font-family: system-ui, sans-serif; border-radius: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 16px; text-align: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" style="display: inline-block; margin-bottom: 8px;">
                                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                            </svg>
                            <h3 style="font-weight: 600; margin: 0; color: white; font-size: 16px;">
                                ${camera.camera_name ? camera.camera_name : (camera.camera_id || 'Unnamed Camera')}
                            </h3>
                            ${camera.camera_name ? `<div style="font-size: 10px; opacity: 0.9; margin-top: 2px;">ID: ${camera.camera_id}</div>` : ''}
                        </div>
                        <div id="analytics-${camera.id}" style="padding: 16px; font-size: 13px; color: #555; line-height: 1.6;">
                            <div style="text-align: center; padding: 20px; color: #999;">
                                <div style="display: inline-block; border: 2px solid #e5e7eb; border-top-color: #22c55e; border-radius: 50%; width: 24px; height: 24px; animation: spin 0.8s linear infinite;"></div>
                                <p style="margin: 8px 0 0 0; font-size: 12px;">Loading analytics...</p>
                            </div>
                        </div>
                        <div style="margin-top: 8px; text-align: center; padding: 0 16px 16px;">
                            <button 
                                onclick="window.dispatchEvent(new CustomEvent('open-camera-gallery', { detail: '${camera.id || camera.camera_id}' }))"
                                style="background: #fdf4ff; border: 1px solid #e879f9; color: #a21caf; border-radius: 4px; padding: 4px 12px; font-size: 11px; cursor: pointer; font-weight: 500;"
                            >
                                View Gallery
                            </button>
                        </div>
                    </div>
                    <style>
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `,
            });

            // Open details and fetch analytics on click
            marker.addListener('click', async () => {
                if (activeInfoWindowRef.current) {
                    activeInfoWindowRef.current.close();
                }
                infoWindow.open({
                    anchor: marker,
                    map,
                });
                activeInfoWindowRef.current = infoWindow;

                // Fetch and update analytics
                const analytics = cameraAnalytics[camera.id] || await fetchCameraAnalytics(camera.id);
                if (analytics) {
                    const analyticsDiv = document.getElementById(`analytics-${camera.id}`);
                    if (analyticsDiv) {
                        const animalStatsHtml = analytics.analytics.animals
                            .slice(0, 5)
                            .map((animal, idx) => `
                                <div style="margin: 6px 0; padding: 8px; background: #f9fafb; border-radius: 4px; font-size: 12px;">
                                    <strong style="color: #333;">${animal.name}</strong>
                                    <span style="float: right; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-weight: 500;">${animal.count}</span>
                                </div>
                            `)
                            .join('');

                        analyticsDiv.innerHTML = `
                            <div style="margin: 8px 0;">
                                <strong style="color: #333;">📊 Detection Summary (Last 30 days)</strong>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0;">
                                <div style="background: #dcfce7; padding: 8px; border-radius: 4px; text-align: center;">
                                    <div style="font-size: 18px; font-weight: bold; color: #16a34a;">${analytics.analytics.total_detections}</div>
                                    <div style="font-size: 11px; color: #15803d;">Total Detections</div>
                                </div>
                                <div style="background: #dbeafe; padding: 8px; border-radius: 4px; text-align: center;">
                                    <div style="font-size: 18px; font-weight: bold; color: #1e40af;">${analytics.analytics.confirmed_detections}</div>
                                    <div style="font-size: 11px; color: #1e3a8a;">Confirmed</div>
                                </div>
                            </div>
                            <div style="margin: 8px 0; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                                <strong style="color: #333; display: block; margin-bottom: 6px;">🦁 Animals Spotted:</strong>
                                ${animalStatsHtml || '<div style="color: #999; font-size: 12px;">No animals detected</div>'}
                            </div>
                            <div style="margin: 8px 0; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
                                <div><strong>Status:</strong> <span style="background: ${camera.status === 'active' ? '#dcfce7' : '#fee2e2'}; color: ${camera.status === 'active' ? '#16a34a' : '#dc2626'}; padding: 2px 6px; border-radius: 3px;">${camera.status.toUpperCase()}</span></div>
                                ${analytics.analytics.last_detection ? `<div style="margin-top: 4px;"><strong>Last Detection:</strong> ${new Date(analytics.analytics.last_detection).toLocaleDateString()}</div>` : ''}
                            </div>
                        `;
                    }
                }
            });

            markersRef.current.push(marker);
        });

        // Add markers for animals (different style)
        animals.forEach(animal => {
            const position = { lat: animal.latitude, lng: animal.longitude };
            bounds.extend(position);

            // Create blue pin for animals
            let marker: any;

            if (hasMapId && google.maps.marker?.AdvancedMarkerElement) {
                const pinElement = new google.maps.marker.PinElement({
                    background: '#3b82f6',
                    borderColor: '#ffffff',
                    glyphColor: '#ffffff',
                    scale: 1.2,
                });

                marker = new google.maps.marker.AdvancedMarkerElement({
                    position,
                    map,
                    title: animal.name,
                    content: pinElement.element,
                });
            } else {
                marker = new google.maps.Marker({
                    position,
                    map,
                    title: animal.name,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 6,
                        fillColor: '#3b82f6',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                });
            }

            const animalInfoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 8px; font-family: system-ui, sans-serif; min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0; color: #1f2937; font-weight: 600;">${animal.name}</h4>
                        <div style="font-size: 12px; color: #555; line-height: 1.5;">
                            <div><strong>Species:</strong> ${animal.species}</div>
                            ${animal.status ? `<div><strong>Status:</strong> ${animal.status}</div>` : ''}
                            ${animal.last_seen ? `<div><strong>Last seen:</strong> ${animal.last_seen}</div>` : ''}
                        </div>
                    </div>
                `,
            });

            marker.addListener('click', () => {
                if (activeInfoWindowRef.current) {
                    activeInfoWindowRef.current.close();
                }
                animalInfoWindow.open({
                    anchor: marker,
                    map,
                });
                activeInfoWindowRef.current = animalInfoWindow;
            });

            markersRef.current.push(marker);
        });

        // Add markers for detections (animal detections from camera traps)
        detections.forEach(detection => {
            // Use camera location if detection doesn't have coordinates
            const lat = detection.latitude || detection.camera_latitude;
            const lng = detection.longitude || detection.camera_longitude;
            
            if (!lat || !lng) return; // Skip if no coordinates

            const position = { lat, lng };
            bounds.extend(position);

            const reviewStatus = getDetectionReviewStatus(detection);
            const confidence = normalizeConfidence(detection.detection_confidence);
            const statusColor = reviewStatus === 'auto_approved' ? '#10b981' :
                                reviewStatus === 'manual_confirmed' ? '#3b82f6' :
                                reviewStatus === 'pending_confirmation' ? '#f59e0b' :
                                '#ef4444';

            let marker: any;

            if (hasMapId && google.maps.marker?.AdvancedMarkerElement) {
                const pinElement = new google.maps.marker.PinElement({
                    background: statusColor,
                    borderColor: '#ffffff',
                    glyphColor: '#ffffff',
                    scale: 1.3,
                });

                marker = new google.maps.marker.AdvancedMarkerElement({
                    position,
                    map,
                    title: detection.detected_animal,
                    content: pinElement.element,
                });
            } else {
                marker = new google.maps.Marker({
                    position,
                    map,
                    title: detection.detected_animal,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: statusColor,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                });
            }

            const normalizedStatusLabel = isAutoApprovedDetection(detection) ? 'Auto-Approved' :
                               reviewStatus === 'manual_confirmed' ? 'Verified' :
                               reviewStatus === 'pending_confirmation' ? 'Pending Review' :
                               'Rejected';

            const thumbnailHtml = detection.thumbnail_path 
                ? `<img src="/api/proxy/${detection.thumbnail_path}" alt="${detection.detected_animal}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />`
                : '';

            const detectionInfoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 12px; font-family: system-ui, sans-serif; min-width: 220px; max-width: 280px;">
                        ${thumbnailHtml}
                        <h4 style="margin: 0 0 4px 0; color: #1f2937; font-weight: 600; font-size: 16px;">${detection.detected_animal}</h4>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-style: italic;">${detection.detected_animal_scientific || ''}</p>
                        
                        <div style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 8px; display: inline-block;">
                            ${normalizedStatusLabel}
                        </div>
                        
                        <div style="font-size: 12px; color: #555; line-height: 1.6; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                            <div><strong>Confidence:</strong> ${confidence}%</div>
                            <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 6px; margin-top: 4px; overflow: hidden;">
                                <div  style="background: ${statusColor}; height: 100%; width: ${confidence}%;"></div>
                            </div>
                            ${detection.taken_at ? `<div style="margin-top: 8px; font-size: 11px; color: #6b7280;">📅 ${new Date(detection.taken_at).toLocaleDateString()}</div>` : ''}
                        </div>
                    </div>
                `,
            });

            marker.addListener('click', () => {
                if (activeInfoWindowRef.current) {
                    activeInfoWindowRef.current.close();
                }
                detectionInfoWindow.open({
                    anchor: marker,
                    map,
                });
                activeInfoWindowRef.current = detectionInfoWindow;
            });

            markersRef.current.push(marker);
        });

        // Fit map to bounds if there are markers
        if (markersRef.current.length > 0) {
            map.fitBounds(bounds);
        }
    }, [map, cameras, animals, detections, mapFallback]);

    // Always prefer the interactive map; never switch to the older fallback UI
    return (
        <div className="relative h-full min-h-[480px] w-full bg-gradient-to-br from-green-50 to-blue-50">
            <div ref={mapRef} className="h-full min-h-[480px] w-full" />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
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
            )}

            {!loading && cameras.length === 0 && (
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

            {error && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg max-w-md">
                    <div className="flex items-center gap-2 text-sm text-red-800">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.312 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
