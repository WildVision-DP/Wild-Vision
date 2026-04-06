// API Base URL Configuration
// In production (Docker), uses /api path (proxied by nginx)
// In development, Vite's proxy will handle /api requests

const getApiUrl = (): string => {
    // Check if API URL is explicitly set via environment variable
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl !== '/api') {
        // If explicitly set to something other than /api, use it
        return envUrl;
    }

    // Default to /api which works in both dev (Vite proxy) and production (nginx proxy)
    return '/api';
};

export const API_BASE_URL = getApiUrl();

/**
 * Make an API request
 */
export async function apiRequest<T>(
    endpoint: string,
    options?: RequestInit & { method?: string }
): Promise<{ data?: T; error?: string; status: number }> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });

        const statusCode = response.status;

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let error = 'Request failed';
            
            if (contentType?.includes('application/json')) {
                const errorData = await response.json();
                error = errorData.error || errorData.message || error;
            } else {
                error = await response.text();
            }
            
            return {
                error,
                status: statusCode,
            };
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const data = await response.json();
            return {
                data,
                status: statusCode,
            };
        } else {
            const text = await response.text();
            return {
                data: text as unknown as T,
                status: statusCode,
            };
        }
    } catch (err: any) {
        console.error(`API Error (${endpoint}):`, err);
        return {
            error: err.message || 'Network error',
            status: 0,
        };
    }
}
