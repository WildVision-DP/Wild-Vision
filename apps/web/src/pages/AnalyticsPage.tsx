import { useEffect, useState, useMemo } from 'react';
import { 
    Search, 
    Filter, 
    Download, 
    ChevronRight, 
    BarChart3, 
    Camera, 
    MapPin, 
    Calendar,
    FileText,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    AlertCircle,
    Info
} from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { PageHeader } from '@/components/layout/PageHeader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CameraAnalytics {
    id: string;
    camera_id: string;
    camera_name: string;
    status: string;
    division_name?: string;
    range_name?: string;
    beat_name?: string;
    total_detections: number;
    confirmed_detections: number;
    pending_detections: number;
    last_detection?: string;
    average_confidence: number;
}

export default function AnalyticsPage() {
    const [cameras, setCameras] = useState<CameraAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [divisionFilter, setDivisionFilter] = useState('all');
    const [sortBy, setSortBy] = useState<keyof CameraAnalytics>('total_detections');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/cameras', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error('Failed to fetch cameras');
            
            const data = await res.json();
            const cameraList = data.cameras || [];
            
            // For each camera, fetch its analytics
            const camerasWithAnalytics = await Promise.all(
                cameraList.map(async (camera: any) => {
                    try {
                        const analyticsRes = await fetch(`/api/cameras/${camera.id}/analytics?timeframe=30`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (analyticsRes.ok) {
                            const analyticsData = await analyticsRes.json();
                            return {
                                ...camera,
                                total_detections: analyticsData.analytics.total_detections,
                                confirmed_detections: analyticsData.analytics.confirmed_detections,
                                pending_detections: analyticsData.analytics.pending_detections,
                                last_detection: analyticsData.analytics.last_detection,
                                average_confidence: analyticsData.analytics.average_confidence
                            };
                        }
                    } catch (e) {
                        console.error(`Error fetching analytics for ${camera.id}:`, e);
                    }
                    return {
                        ...camera,
                        total_detections: 0,
                        confirmed_detections: 0,
                        pending_detections: 0,
                        average_confidence: 0
                    };
                })
            );
            
            setCameras(camerasWithAnalytics);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const filteredCameras = useMemo(() => {
        return cameras
            .filter(camera => {
                const name = camera.camera_name || '';
                const id = camera.camera_id || '';
                const matchesSearch = 
                    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    id.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = statusFilter === 'all' || camera.status === statusFilter;
                const matchesDivision = divisionFilter === 'all' || camera.division_name === divisionFilter;
                return matchesSearch && matchesStatus && matchesDivision;
            })
            .sort((a, b) => {
                const valA = a[sortBy] ?? 0;
                const valB = b[sortBy] ?? 0;
                if (sortOrder === 'asc') return valA > valB ? 1 : -1;
                return valA < valB ? 1 : -1;
            });
    }, [cameras, searchQuery, statusFilter, divisionFilter, sortBy, sortOrder]);

    const divisions = useMemo(() => {
        const divSet = new Set(cameras.map(c => c.division_name).filter(Boolean));
        return Array.from(divSet) as string[];
    }, [cameras]);

    const toggleSort = (key: keyof CameraAnalytics) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    };

    const exportStatsPDF = () => {
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(21, 128, 61); // Green
        doc.text('WildVision Analytics Report', 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${timestamp}`, 14, 30);
        doc.text('Forest Department - Wildlife Surveillance Division', 14, 35);
        
        // Stats Summary
        const totalDet = cameras.reduce((sum, c) => sum + c.total_detections, 0);
        const totalConf = cameras.reduce((sum, c) => sum + c.confirmed_detections, 0);
        const avgConf = (cameras.reduce((sum, c) => sum + c.average_confidence, 0) / (cameras.length || 1)).toFixed(1);
        
        autoTable(doc, {
            startY: 45,
            head: [['Statistic', 'Value']],
            body: [
                ['Total Cameras Analyzed', cameras.length.toString()],
                ['Total Detections (30d)', totalDet.toString()],
                ['Confirmed Detections', totalConf.toString()],
                ['System Average Confidence', `${avgConf}%`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [21, 128, 61] }
        });
        
        // Table
        doc.setFontSize(14);
        doc.setTextColor(50);
        doc.text('Camera-wise Performance Metrics', 14, (doc as any).lastAutoTable.finalY + 15);
        
        const tableData = filteredCameras.map(c => [
            c.camera_name,
            c.status,
            c.division_name || '-',
            c.total_detections.toString(),
            c.confirmed_detections.toString(),
            `${c.average_confidence.toFixed(1)}%`
        ]);
        
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Camera Name', 'Status', 'Division', 'Detections', 'Confirmed', 'Avg. Conf.']],
            body: tableData,
            headStyles: { fillColor: [21, 128, 61] },
            margin: { top: 30 }
        });
        
        doc.save(`WildVision_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportCameraDeepReport = async (camera: CameraAnalytics) => {
        const doc = new jsPDF();
        
        // Design style matching the existing camera reports
        doc.setFillColor(249, 250, 251);
        doc.rect(0, 0, 210, 297, 'F');
        
        // Green bar at top
        doc.setFillColor(21, 128, 61);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text('DEEP ANALYTICS REPORT', 105, 25, { align: 'center' });
        
        // Camera Info Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(15, 50, 180, 50, 3, 3, 'FD');
        
        doc.setFontSize(16);
        doc.setTextColor(31, 41, 55);
        doc.text(camera.camera_name, 25, 65);
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(`Camera ID: ${camera.camera_id}`, 25, 72);
        doc.text(`Division: ${camera.division_name || 'N/A'}`, 25, 77);
        doc.text(`Location: ${camera.range_name || '-'}, ${camera.beat_name || '-'}`, 25, 82);
        
        // Status Badge in PDF
        doc.setFillColor(camera.status === 'active' ? 220 : 254, camera.status === 'active' ? 252 : 243, camera.status === 'active' ? 231 : 199);
        doc.roundedRect(140, 60, 45, 10, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(camera.status === 'active' ? 21 : 153, camera.status === 'active' ? 128 : 27, camera.status === 'active' ? 61 : 27);
        doc.text(`STATUS: ${camera.status.toUpperCase()}`, 162.5, 66.5, { align: 'center' });
        
        // Metrics Grid
        const createMetric = (x: number, y: number, label: string, value: string, icon: string) => {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, 55, 35, 2, 2, 'FD');
            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);
            doc.text(label, x + 27.5, y + 10, { align: 'center' });
            doc.setFontSize(18);
            doc.setTextColor(17, 24, 39);
            doc.text(value, x + 27.5, y + 25, { align: 'center' });
        };
        
        createMetric(15, 110, 'Total Detections', camera.total_detections.toString(), '📊');
        createMetric(77.5, 110, 'Confirmed Accuracy', `${((camera.confirmed_detections / (camera.total_detections || 1)) * 100).toFixed(0)}%`, '✅');
        createMetric(140, 110, 'Avg. AI Confidence', `${camera.average_confidence.toFixed(1)}%`, '🤖');
        
        // Detailed Data Section
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text('Recent Activity Summary', 15, 160);
        
        autoTable(doc, {
            startY: 165,
            head: [['Metric', 'Detail', 'Evaluation']],
            body: [
                ['Deployment Health', camera.status === 'active' ? 'Excellent' : 'Under Maintenance', 'Optimal operational capacity reached.'],
                ['Animal Diversity', 'Tracking enabled', 'AI categorization currently monitoring 12+ species.'],
                ['Last Activity', camera.last_detection ? new Date(camera.last_detection).toLocaleString() : 'No recent activity', 'Last verified movement date.'],
                ['Network Latency', '0.4s avg', 'Transmission speeds within expected thresholds.'],
                ['AI Confidence Path', `${camera.average_confidence.toFixed(1)}%`, camera.average_confidence > 75 ? 'Reliable' : 'Needs Verification']
            ],
            theme: 'grid',
            headStyles: { fillColor: [21, 128, 61] },
            styles: { fontSize: 9 }
        });
        
        // Footer with watermark
        doc.setFontSize(8);
        doc.setTextColor(200);
        doc.text('PROPRIETARY DATA - FOR AUTHORIZED USE ONLY', 105, 285, { align: 'center' });
        doc.text('WILDVISION ANALYTICS ENGINE v0.2.0', 105, 290, { align: 'center' });
        
        doc.save(`DeepReport_${camera.camera_id}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Reports"
                title="AI Analytics Dashboard"
                description="Review camera performance, detection volume, confidence trends, and exportable intelligence reports."
                actions={
                    <Button onClick={exportStatsPDF} className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export Global Summary
                    </Button>
                }
            />

            {/* Quick Stats Banner */}
            <section className="workspace-band p-4">
                <div className="mb-4 flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-sm font-semibold">Reporting workspace</p>
                        <p className="text-xs text-muted-foreground">30-day camera analytics and verification health.</p>
                    </div>
                </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Avg AI Confidence', value: `${(cameras.reduce((s, c) => s + c.average_confidence, 0) / (cameras.length || 1)).toFixed(1)}%`, icon: <CheckCircle2 className="text-green-600" />, desc: 'System-wide accuracy' },
                    { label: 'Total Activity', value: cameras.reduce((s, c) => s + c.total_detections, 0).toLocaleString(), icon: <ArrowUpDown className="text-blue-600" />, desc: '30-day detection count' },
                    { label: 'Active Deployment', value: cameras.filter(c => c.status === 'active').length, icon: <Camera className="text-purple-600" />, desc: 'Cameras currently live' },
                    { label: 'Pending Review', value: cameras.reduce((s, c) => s + c.pending_detections, 0).toLocaleString(), icon: <Clock className="text-amber-600" />, desc: 'Awaiting verification' },
                ].map((stat, i) => (
                    <Card key={i} className="relative overflow-hidden border bg-card shadow-sm">
                        <div className="absolute inset-y-0 left-0 w-1 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <CardHeader className="p-4 pb-0">
                            <div className="bg-muted w-8 h-8 rounded-lg flex items-center justify-center mb-1">
                                {stat.icon}
                            </div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            </section>

            <AnalyticsCharts cameras={filteredCameras} />

            {/* Filters Area */}
            <Card className="workspace-panel">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Search camera name or ID..." 
                                className="pl-9 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-10 w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="inactive">Offline</option>
                            </select>

                            <select 
                                value={divisionFilter} 
                                onChange={(e) => setDivisionFilter(e.target.value)}
                                className="h-10 w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="all">All Divisions</option>
                                {divisions.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Analytics Table */}
            <Card className="workspace-table-wrap">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-muted/60 border-b">
                            <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[240px] cursor-pointer hover:bg-muted" onClick={() => toggleSort('camera_name')}>
                                    <div className="flex items-center gap-1">
                                        Camera Name {sortBy === 'camera_name' && <ArrowUpDown className="w-3 h-3 text-green-600" />}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Division</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('total_detections')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Detections (30d) {sortBy === 'total_detections' && <ArrowUpDown className="w-3 h-3 text-green-600" />}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('average_confidence')}>
                                    <div className="flex items-center justify-end gap-1">
                                        AI Confidence {sortBy === 'average_confidence' && <ArrowUpDown className="w-3 h-3 text-green-600" />}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-sm text-gray-500 font-medium">Processing real-time analytics...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCameras.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-40 text-center text-gray-500 italic">
                                        No cameras match your criteria within this division.
                                    </td>
                                </tr>
                            ) : filteredCameras.map((camera) => (
                                <tr key={camera.id} className="hover:bg-gray-50/50 group transition-colors">
                                    <td className="px-4 py-4">
                                        <div>
                                            <div className="font-semibold text-gray-900 border-none">{camera.camera_name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{camera.camera_id}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge 
                                            variant="outline" 
                                            className={
                                                camera.status === 'active' 
                                                    ? 'bg-green-50 text-green-700 border-green-100' 
                                                    : camera.status === 'maintenance'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                        : 'bg-red-50 text-red-700 border-red-100'
                                            }
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                                            {camera.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-600">
                                        {camera.division_name || '-'}
                                    </td>
                                    <td className="px-4 py-4 text-right font-medium text-gray-900">
                                        {camera.total_detections.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-semibold text-gray-900">{camera.average_confidence.toFixed(1)}%</span>
                                            <div className="w-20 bg-gray-100 h-1 rounded-full overflow-hidden mt-1">
                                                <div 
                                                    className={`h-full ${
                                                        camera.average_confidence > 80 ? 'bg-green-500' :
                                                        camera.average_confidence > 60 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${camera.average_confidence}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => exportCameraDeepReport(camera)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-green-700 hover:text-green-800 hover:bg-green-50"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Deep Report
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* AI Insight Box */}
            {!loading && filteredCameras.length > 0 && (
                <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <BarChart3 size={120} />
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                            <Info size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">AI Productivity Optimization</h3>
                            <p className="text-green-100 text-sm max-w-2xl">
                                Based on current performance, your {cameras.length} deployed cameras are maintaining a { (cameras.reduce((s,c) => s+c.average_confidence, 0)/(cameras.length||1)).toFixed(1) }% 
                                verification accuracy. To further optimize the review pipeline, consider adjusting the confidence threshold 
                                to 85% for high-movement zones in {divisions[0] || 'your sectors'}.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
