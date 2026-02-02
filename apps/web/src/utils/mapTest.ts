// Utility to test Google Maps API connectivity
export async function testGoogleMapsAPI(apiKey: string): Promise<{ 
    success: boolean; 
    error?: string; 
    details?: any 
}> {
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        return {
            success: false,
            error: 'Invalid or missing API key',
            details: 'Please set VITE_GOOGLE_MAPS_API_KEY in your .env file'
        };
    }

    try {
        // Test API key with a simple geocoding request
        const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Bandipur%20National%20Park&key=${apiKey}`;
        
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (data.status === 'OK') {
            return { success: true };
        } else if (data.status === 'REQUEST_DENIED') {
            return {
                success: false,
                error: 'API key invalid or access denied',
                details: data.error_message || 'Check API key permissions and restrictions'
            };
        } else if (data.status === 'OVER_QUERY_LIMIT') {
            return {
                success: false,
                error: 'API quota exceeded',
                details: 'Daily or usage limit reached for this API key'
            };
        } else {
            return {
                success: false,
                error: `API error: ${data.status}`,
                details: data.error_message || 'Unknown API error'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: 'Network error',
            details: error instanceof Error ? error.message : 'Failed to connect to Google Maps API'
        };
    }
}

// Simple coordinate validator
export function validateCoordinates(lat: number, lng: number): boolean {
    return (
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        !isNaN(lat) && !isNaN(lng)
    );
}

// Check if coordinates are within India (approximate bounds)
export function isInIndia(lat: number, lng: number): boolean {
    const indiaBounds = {
        north: 37.6,
        south: 6.4,
        east: 97.25,
        west: 68.1
    };
    
    return (
        lat >= indiaBounds.south && lat <= indiaBounds.north &&
        lng >= indiaBounds.west && lng <= indiaBounds.east
    );
}

// Default camera positions for testing (Bandipur National Park area)
export const defaultTestCameras = [
    {
        id: '1',
        camera_id: 'BNP-001',
        latitude: 11.7401,
        longitude: 76.4951,
        status: 'active',
        division_name: 'Bandipur',
        range_name: 'Moolehole',
        notes: 'Main entrance camera'
    },
    {
        id: '2', 
        camera_id: 'BNP-002',
        latitude: 11.8084,
        longitude: 76.6019,
        status: 'active',
        division_name: 'Bandipur',
        range_name: 'Hediyala',
        notes: 'Forest patrol route'
    },
    {
        id: '3',
        camera_id: 'BNP-003', 
        latitude: 11.6954,
        longitude: 76.5331,
        status: 'maintenance',
        division_name: 'Bandipur',
        range_name: 'Gopalaswamy',
        notes: 'Hill top monitoring'
    }
];
