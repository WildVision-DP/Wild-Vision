import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common';
import { BarChart3 } from 'lucide-react';

interface CameraChartDatum {
    camera_name?: string;
    camera_id?: string;
    status?: string;
    total_detections: number;
    confirmed_detections: number;
    pending_detections: number;
    average_confidence: number;
}

interface AnalyticsChartsProps {
    cameras: CameraChartDatum[];
}

const statusColors: Record<string, string> = {
    active: '#16a34a',
    maintenance: '#d97706',
    inactive: '#64748b',
};

export function AnalyticsCharts({ cameras }: AnalyticsChartsProps) {
    const topCameras = [...cameras]
        .sort((a, b) => b.total_detections - a.total_detections)
        .slice(0, 8)
        .map((camera) => ({
            name: camera.camera_name || camera.camera_id || 'Camera',
            detections: camera.total_detections,
            confirmed: camera.confirmed_detections,
            pending: camera.pending_detections,
            confidence: Number(camera.average_confidence.toFixed(1)),
        }));

    const statusData = Object.entries(
        cameras.reduce<Record<string, number>>((acc, camera) => {
            const status = camera.status || 'inactive';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {})
    ).map(([status, value]) => ({ status, value }));

    if (cameras.length === 0) {
        return (
            <EmptyState
                title="No analytics data available"
                description="Camera charts will appear once camera analytics are loaded."
                icon={BarChart3}
            />
        );
    }

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Top Camera Activity</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topCameras}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="detections" name="Detections" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="confirmed" name="Confirmed" fill="#16a34a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pending" name="Pending" fill="#d97706" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Deployment Status</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                dataKey="value"
                                nameKey="status"
                                innerRadius={58}
                                outerRadius={96}
                                paddingAngle={3}
                            >
                                {statusData.map((entry) => (
                                    <Cell key={entry.status} fill={statusColors[entry.status] || '#0f766e'} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
