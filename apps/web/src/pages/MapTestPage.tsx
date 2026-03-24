import { useEffect, useState } from 'react';

export default function MapTestPage() {
    const [diagnostics, setDiagnostics] = useState<{
        apiKey: string;
        apiKeyPresent: boolean;
        apiKeyValue: string;
        allEnvVars: Record<string, string>;
    }>({
        apiKey: '',
        apiKeyPresent: false,
        apiKeyValue: '',
        allEnvVars: {}
    });

    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const allEnvVars = import.meta.env as unknown as Record<string, string>;

        setDiagnostics({
            apiKey: apiKey || 'NOT_FOUND',
            apiKeyPresent: !!apiKey,
            apiKeyValue: apiKey ? `${apiKey.substring(0, 20)}...` : 'NONE',
            allEnvVars
        });

        console.log('=== GOOGLE MAPS DIAGNOSTICS ===');
        console.log('API Key Present:', !!apiKey);
        console.log('API Key Value:', apiKey);
        console.log('All Environment Variables:', allEnvVars);
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Google Maps Configuration Test</h1>

            <div className="space-y-6">
                {/* API Key Status */}
                <div className="p-6 bg-white rounded-lg border">
                    <h2 className="text-xl font-semibold mb-4">API Key Status</h2>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${diagnostics.apiKeyPresent ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-medium">
                                {diagnostics.apiKeyPresent ? 'API Key Found' : 'API Key Missing'}
                            </span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
                            {diagnostics.apiKeyValue}
                        </div>
                    </div>
                </div>

                {/* Environment Variables */}
                <div className="p-6 bg-white rounded-lg border">
                    <h2 className="text-xl font-semibold mb-4">All Environment Variables</h2>
                    <div className="bg-gray-50 p-4 rounded font-mono text-xs max-h-96 overflow-auto">
                        <pre>{JSON.stringify(diagnostics.allEnvVars, null, 2)}</pre>
                    </div>
                </div>

                {/* Troubleshooting Steps */}
                <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h2 className="text-xl font-semibold mb-4 text-yellow-900">Troubleshooting Steps</h2>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-900">
                        <li>Verify <code className="bg-yellow-100 px-1 rounded">apps/web/.env</code> file exists</li>
                        <li>Check that the file contains <code className="bg-yellow-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=...</code></li>
                        <li>Environment variables starting with <code className="bg-yellow-100 px-1 rounded">VITE_</code> are exposed to the client</li>
                        <li>Restart the dev server after changing .env files</li>
                        <li>Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)</li>
                    </ol>
                </div>

                {/* Google Cloud Console Checks */}
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h2 className="text-xl font-semibold mb-4 text-blue-900">Google Cloud Console Checks</h2>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900">
                        <li>
                            <a 
                                href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                            >
                                Enable Maps JavaScript API
                            </a>
                        </li>
                        <li>
                            <a 
                                href="https://console.cloud.google.com/billing" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                            >
                                Verify billing is enabled
                            </a>
                        </li>
                        <li>
                            <a 
                                href="https://console.cloud.google.com/apis/credentials" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                            >
                                Check API key restrictions
                            </a> - Ensure localhost is allowed
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
