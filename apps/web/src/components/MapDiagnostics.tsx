import { useEffect, useState } from 'react';
import { testGoogleMapsAPI } from '../utils/mapTest';

interface MapDiagnosticsProps {
    onClose: () => void;
}

export default function MapDiagnostics({ onClose }: MapDiagnosticsProps) {
    const [diagnostics, setDiagnostics] = useState<{
        apiKey: string;
        apiTest: { success: boolean; error?: string; details?: any } | null;
        browserInfo: string;
        geolocationSupport: boolean;
        loading: boolean;
    }>({
        apiKey: '',
        apiTest: null,
        browserInfo: '',
        geolocationSupport: false,
        loading: true
    });

    useEffect(() => {
        runDiagnostics();
    }, []);

    const runDiagnostics = async () => {
        setDiagnostics(prev => ({ ...prev, loading: true }));

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        
        // Test API
        const apiTest = await testGoogleMapsAPI(apiKey);
        
        // Get browser info
        const browserInfo = `${navigator.userAgent}`;
        
        // Check geolocation support
        const geolocationSupport = 'geolocation' in navigator;

        setDiagnostics({
            apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not configured',
            apiTest,
            browserInfo,
            geolocationSupport,
            loading: false
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Map Diagnostics</h2>
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {diagnostics.loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Running diagnostics...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* API Key Status */}
                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-2">🔑 API Configuration</h3>
                                <div className="text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">API Key:</span>
                                        <span className="font-mono">{diagnostics.apiKey}</span>
                                    </div>
                                </div>
                            </div>

                            {/* API Test Results */}
                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-2">🧪 API Test Results</h3>
                                <div className="text-sm">
                                    {diagnostics.apiTest ? (
                                        <div className={`p-3 rounded ${diagnostics.apiTest.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-2 h-2 rounded-full ${diagnostics.apiTest.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span className="font-medium">
                                                    {diagnostics.apiTest.success ? 'API Working' : 'API Failed'}
                                                </span>
                                            </div>
                                            {!diagnostics.apiTest.success && (
                                                <div className="text-xs space-y-1">
                                                    <div><strong>Error:</strong> {diagnostics.apiTest.error}</div>
                                                    {diagnostics.apiTest.details && (
                                                        <div><strong>Details:</strong> {diagnostics.apiTest.details}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-gray-500">API test not completed</div>
                                    )}
                                </div>
                            </div>

                            {/* Browser Support */}
                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-2">🌐 Browser Support</h3>
                                <div className="text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Geolocation:</span>
                                        <span className={diagnostics.geolocationSupport ? 'text-green-600' : 'text-red-600'}>
                                            {diagnostics.geolocationSupport ? 'Supported' : 'Not supported'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        <strong>User Agent:</strong> {diagnostics.browserInfo}
                                    </div>
                                </div>
                            </div>

                            {/* Troubleshooting Tips */}
                            <div className="border rounded-lg p-4 bg-blue-50">
                                <h3 className="font-semibold text-blue-900 mb-2">💡 Troubleshooting Tips</h3>
                                <div className="text-sm text-blue-800 space-y-2">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Check if Google Maps JavaScript API is enabled in Google Cloud Console</li>
                                        <li>Verify API key restrictions allow your domain (localhost for development)</li>
                                        <li>Ensure billing is enabled for the Google Cloud project</li>
                                        <li>Check browser console for additional error messages</li>
                                        <li>Try clearing browser cache and refreshing</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={runDiagnostics}
                            disabled={diagnostics.loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {diagnostics.loading ? 'Testing...' : 'Run Test Again'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
