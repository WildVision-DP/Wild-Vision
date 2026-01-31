export default function DashboardPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = async () => {
        const token = localStorage.getItem('accessToken');

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">🐅</span>
                        <h1 className="text-2xl font-bold text-gray-900">WildVision</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                            <p className="text-xs text-gray-500">{user.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Welcome to WildVision Dashboard</h2>
                    <p className="text-gray-600">
                        Wildlife Surveillance & Movement Analytics Platform for the Forest Department of India
                    </p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h3 className="font-semibold text-green-900">Cameras</h3>
                            <p className="text-2xl font-bold text-green-700 mt-2">0</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <h3 className="font-semibold text-amber-900">Images</h3>
                            <p className="text-2xl font-bold text-amber-700 mt-2">0</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 className="font-semibold text-blue-900">Detections</h3>
                            <p className="text-2xl font-bold text-blue-700 mt-2">0</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
