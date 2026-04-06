import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Filter, SortAsc, Search, RefreshCw } from 'lucide-react';

interface Detection {
    id: string;
    detected_animal: string;
    detected_animal_scientific: string;
    detection_confidence: number;
    auto_approved: boolean;
    confirmation_status: string;
    thumbnail_path?: string;
    taken_at?: string;
    camera_name?: string;
    camera_id?: string;
    division_name?: string;
    range_name?: string;
}

interface FilterState {
    animalType: string;
    dateRange: { from: string; to: string };
    location: string; // division or range
    confidenceRange: { min: number; max: number };
    status: string[];
}

interface SortState {
    field: 'latest' | 'oldest' | 'confidence_high' | 'confidence_low' | 'animal_name';
    label: string;
}

export default function AdvancedDashboard() {
    const [detections, setDetections] = useState<Detection[]>([]);
    const [filteredDetections, setFilteredDetections] = useState<Detection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [animals, setAnimals] = useState<string[]>([]);
    const [locations, setLocations] = useState<string[]>([]);

    const [filters, setFilters] = useState<FilterState>({
        animalType: '',
        dateRange: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0],
        },
        location: '',
        confidenceRange: { min: 0, max: 100 },
        status: ['confirmed', 'pending_confirmation'],
    });

    const [sortBy, setSortBy] = useState<SortState>({
        field: 'latest',
        label: 'Latest First',
    });

    const [searchTerm, setSearchTerm] = useState('');

    // Fetch detections
    const fetchDetections = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/images?limit=1000&sort=confirmed_at', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch detections');

            const data = await response.json();
            setDetections(data.images || []);
            setFilteredDetections(data.images || []);

            // Extract unique animals and locations
            const uniqueAnimals = [...new Set(data.images?.map((d: Detection) => d.detected_animal) || [])].sort();
            const uniqueLocations = [...new Set(
                data.images?.map((d: Detection) => d.division_name || d.range_name).filter(Boolean) || []
            )].sort();

            setAnimals(uniqueAnimals as string[]);
            setLocations(uniqueLocations as string[]);
        } catch (error) {
            console.error('Fetch detections error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDetections();
    }, [fetchDetections]);

    // Apply filters and sorting
    useEffect(() => {
        let result = [...detections];

        // Animal filter
        if (filters.animalType) {
            result = result.filter(d => d.detected_animal.toLowerCase() === filters.animalType.toLowerCase());
        }

        // Date range filter
        if (filters.dateRange.from || filters.dateRange.to) {
            result = result.filter(d => {
                const takenAt = d.taken_at ? new Date(d.taken_at) : new Date();
                const from = new Date(filters.dateRange.from);
                const to = new Date(filters.dateRange.to);
                return takenAt >= from && takenAt <= to;
            });
        }

        // Location filter
        if (filters.location) {
            result = result.filter(d =>
                d.division_name === filters.location || d.range_name === filters.location
            );
        }

        // Confidence range filter
        result = result.filter(d =>
            d.detection_confidence >= filters.confidenceRange.min &&
            d.detection_confidence <= filters.confidenceRange.max
        );

        // Status filter
        if (filters.status.length > 0) {
            result = result.filter(d => filters.status.includes(d.confirmation_status));
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(d =>
                d.detected_animal.toLowerCase().includes(term) ||
                d.camera_name?.toLowerCase().includes(term) ||
                d.division_name?.toLowerCase().includes(term)
            );
        }

        // Apply sorting
        switch (sortBy.field) {
            case 'latest':
                result.sort((a, b) => new Date(b.taken_at || '').getTime() - new Date(a.taken_at || '').getTime());
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.taken_at || '').getTime() - new Date(b.taken_at || '').getTime());
                break;
            case 'confidence_high':
                result.sort((a, b) => b.detection_confidence - a.detection_confidence);
                break;
            case 'confidence_low':
                result.sort((a, b) => a.detection_confidence - b.detection_confidence);
                break;
            case 'animal_name':
                result.sort((a, b) => a.detected_animal.localeCompare(b.detected_animal));
                break;
        }

        setFilteredDetections(result);
    }, [detections, filters, sortBy, searchTerm]);

    const toggleStatus = (status: string) => {
        setFilters(prev => ({
            ...prev,
            status: prev.status.includes(status)
                ? prev.status.filter(s => s !== status)
                : [...prev.status, status],
        }));
    };

    const clearFilters = () => {
        setFilters({
            animalType: '',
            dateRange: {
                from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0],
            },
            location: '',
            confidenceRange: { min: 0, max: 100 },
            status: ['confirmed', 'pending_confirmation'],
        });
        setSearchTerm('');
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800';
            case 'pending_confirmation':
                return 'bg-yellow-100 text-yellow-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">🦁 Advanced Detection Dashboard</h1>
                <p className="text-gray-600">View, filter, and analyze animal detection analytics</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by animal, camera, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                        <Filter size={20} />
                        {showFilters ? 'Hide' : 'Show'} Filters
                    </button>
                    <button
                        onClick={fetchDetections}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        title="Refresh data"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Animal Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Animal Type</label>
                            <select
                                value={filters.animalType}
                                onChange={(e) => setFilters(prev => ({ ...prev, animalType: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                            >
                                <option value="">All Animals</option>
                                {animals.map(animal => (
                                    <option key={animal} value={animal}>{animal}</option>
                                ))}
                            </select>
                        </div>

                        {/* Location Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <select
                                value={filters.location}
                                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                            >
                                <option value="">All Locations</option>
                                {locations.map(location => (
                                    <option key={location} value={location}>{location}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={filters.dateRange.from}
                                    onChange={(e) => setFilters(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, from: e.target.value }
                                    }))}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                                />
                                <input
                                    type="date"
                                    value={filters.dateRange.to}
                                    onChange={(e) => setFilters(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, to: e.target.value }
                                    }))}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                                />
                            </div>
                        </div>

                        {/* Confidence Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Range</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={filters.confidenceRange.min}
                                    onChange={(e) => setFilters(prev => ({
                                        ...prev,
                                        confidenceRange: { ...prev.confidenceRange, min: parseInt(e.target.value) }
                                    }))}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                                    placeholder="Min %"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={filters.confidenceRange.max}
                                    onChange={(e) => setFilters(prev => ({
                                        ...prev,
                                        confidenceRange: { ...prev.confidenceRange, max: parseInt(e.target.value) }
                                    }))}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                                    placeholder="Max %"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <div className="space-y-2">
                                {['confirmed', 'pending_confirmation', 'rejected'].map(status => (
                                    <label key={status} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={filters.status.includes(status)}
                                            onChange={() => toggleStatus(status)}
                                            className="w-4 h-4 text-green-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700">
                                            {status === 'confirmed' ? '✅ Confirmed' :
                                                status === 'pending_confirmation' ? '⏳ Pending' : '❌ Rejected'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Sort Options */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                            <select
                                value={sortBy.field}
                                onChange={(e) => {
                                    const sortOptions: Record<string, SortState> = {
                                        latest: { field: 'latest', label: 'Latest First' },
                                        oldest: { field: 'oldest', label: 'Oldest First' },
                                        confidence_high: { field: 'confidence_high', label: 'Confidence (High → Low)' },
                                        confidence_low: { field: 'confidence_low', label: 'Confidence (Low → High)' },
                                        animal_name: { field: 'animal_name', label: 'Animal Name (A → Z)' },
                                    };
                                    setSortBy(sortOptions[e.target.value] || sortOptions.latest);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                            >
                                <option value="latest">Latest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="confidence_high">Confidence (High → Low)</option>
                                <option value="confidence_low">Confidence (Low → High)</option>
                                <option value="animal_name">Animal Name (A → Z)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={clearFilters}
                        className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                        Clear All Filters
                    </button>
                </div>
            )}

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
                Showing {filteredDetections.length} of {detections.length} detections
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <div className="inline-block border-4 border-gray-200 border-t-green-600 rounded-full w-12 h-12 animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading detections...</p>
                    </div>
                </div>
            )}

            {/* Detection Gallery */}
            {!loading && filteredDetections.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDetections.map(detection => (
                        <div key={detection.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                            {/* Image */}
                            {detection.thumbnail_path && (
                                <div className="aspect-video bg-gray-200 overflow-hidden">
                                    <img
                                        src={detection.thumbnail_path}
                                        alt={detection.detected_animal}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-bold text-lg text-gray-900 mb-1 capitalize">
                                    {detection.detected_animal}
                                </h3>
                                <p className="text-xs text-gray-600 mb-2 italic">{detection.detected_animal_scientific}</p>

                                {/* Confidence Badge */}
                                <div className="mb-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-gray-700">Confidence</span>
                                        <span className={`text-xs font-bold ${
                                            detection.detection_confidence >= 90 ? 'text-green-600' :
                                            detection.detection_confidence >= 70 ? 'text-yellow-600' : 'text-orange-600'
                                        }`}>
                                            {Math.round(detection.detection_confidence)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${
                                                detection.detection_confidence >= 90 ? 'bg-green-500' :
                                                detection.detection_confidence >= 70 ? 'bg-yellow-500' : 'bg-orange-500'
                                            }`}
                                            style={{ width: `${detection.detection_confidence}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="mb-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(detection.confirmation_status)}`}>
                                        {detection.auto_approved ? '🤖 ' : ''}
                                        {detection.confirmation_status === 'confirmed' ? 'Confirmed' :
                                         detection.confirmation_status === 'pending_confirmation' ? 'Pending' : 'Rejected'}
                                    </span>
                                </div>

                                {/* Meta Info */}
                                <div className="text-xs text-gray-600 space-y-1">
                                    {detection.camera_name && <p>📷 {detection.camera_name}</p>}
                                    {detection.division_name && <p>📍 {detection.division_name}</p>}
                                    {detection.taken_at && <p>🕐 {new Date(detection.taken_at).toLocaleDateString()}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredDetections.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-lg text-gray-500">No detections found matching your filters.</p>
                    <button
                        onClick={clearFilters}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        Clear Filters
                    </button>
                </div>
            )}
        </div>
    );
}
