import { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, TestTube, Settings, Image as ImageIcon, Search, X, Map, List, Printer } from 'lucide-react';
import CameraGallery from '@/components/CameraGallery';
import Modal from '@/components/ui/Modal';
import CameraForm from '@/components/CameraForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AlertDialog from '@/components/ui/AlertDialog';
import MapDiagnostics from '../components/MapDiagnostics';
import { defaultTestCameras, testGoogleMapsAPI } from '../utils/mapTest';

export default function CamerasPage() {
    const [cameras, setCameras] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCamera, setEditingCamera] = useState<any>(null);
    const [viewGalleryId, setViewGalleryId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; cameraId: string | null }>({ isOpen: false, cameraId: null });
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; variant: 'error' | 'success' }>({ isOpen: false, title: '', message: '', variant: 'error' });
    const [testMode, setTestMode] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    
    // Tab state
    const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'maintenance' | 'inactive'>('all');
    const [filterDivision, setFilterDivision] = useState<string>('all');
    const [filterRange, setFilterRange] = useState<string>('all');
    const [filterBeat, setFilterBeat] = useState<string>('all');
    const [filterBrand, setFilterBrand] = useState<string>('all');

    useEffect(() => {
        fetchCameras();
        // Test Google Maps API on load
        testMapAPI();

        // Listen for map popup events
        const handleOpenGallery = (e: any) => {
            if (e.detail) setViewGalleryId(e.detail);
        };
        window.addEventListener('open-camera-gallery', handleOpenGallery);
        return () => window.removeEventListener('open-camera-gallery', handleOpenGallery);
    }, []);

    const testMapAPI = async () => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const result = await testGoogleMapsAPI(apiKey);

        if (!result.success) {
            console.warn('Google Maps API test failed:', result.error);
            console.warn('Details:', result.details);
        } else {
            console.log('Google Maps API test successful');
        }
    };

    const fetchCameras = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');

            if (!token) {
                console.warn('No access token found');
                setCameras([]);
                setLoading(false);
                return;
            }

            console.log('Fetching cameras...');
            const response = await fetch('/api/cameras', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('Camera fetch response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Camera data received:', data);
                const cameraData = data.cameras || [];
                setCameras(cameraData);
                console.log('Cameras set to state:', cameraData.length, 'cameras');
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch cameras - Response:', errorText);
                setCameras([]);
                setAlert({ isOpen: true, title: 'Error', message: 'Failed to load camera data', variant: 'error' });
            }
        } catch (error) {
            console.error('Failed to fetch cameras:', error);
            setCameras([]);
            setAlert({ isOpen: true, title: 'Network Error', message: 'Unable to connect to server', variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Filter cameras based on search and filters
    const filteredCameras = cameras.filter(cam => {
        // Search filter (name or ID)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = cam.camera_name?.toLowerCase().includes(query);
            const matchesId = cam.camera_id?.toLowerCase().includes(query);
            if (!matchesName && !matchesId) return false;
        }
        if (filterStatus !== 'all' && cam.status !== filterStatus) return false;
        if (filterDivision !== 'all' && cam.division_name !== filterDivision) return false;
        if (filterRange !== 'all' && cam.range_name !== filterRange) return false;
        if (filterBeat !== 'all' && cam.beat_name !== filterBeat) return false;
        if (filterBrand !== 'all' && cam.brand_name !== filterBrand) return false;
        return true;
    });

    const isFiltered = searchQuery || filterStatus !== 'all' || filterDivision !== 'all' || filterRange !== 'all' || filterBeat !== 'all' || filterBrand !== 'all';

    // Cascading dropdown options
    const uniqueDivisions = Array.from(new Set(cameras.map(c => c.division_name).filter(Boolean))) as string[];
    const uniqueRanges = Array.from(new Set(
        cameras
            .filter(c => filterDivision === 'all' || c.division_name === filterDivision)
            .map(c => c.range_name)
            .filter(Boolean)
    )) as string[];
    const uniqueBeats = Array.from(new Set(
        cameras
            .filter(c =>
                (filterDivision === 'all' || c.division_name === filterDivision) &&
                (filterRange === 'all' || c.range_name === filterRange)
            )
            .map(c => c.beat_name)
            .filter(Boolean)
    )) as string[];
    const uniqueBrands = Array.from(new Set(cameras.map(c => c.brand_name).filter(Boolean))) as string[];

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        setFilterDivision('all');
        setFilterRange('all');
        setFilterBeat('all');
        setFilterBrand('all');
    };

    // Reset dependent filters on cascade change
    const handleDivisionChange = (val: string) => {
        setFilterDivision(val);
        setFilterRange('all');
        setFilterBeat('all');
    };
    const handleRangeChange = (val: string) => {
        setFilterRange(val);
        setFilterBeat('all');
    };

    const handleCreate = async (data: any) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/cameras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                await fetchCameras();
                closeModal();
                setAlert({ isOpen: true, title: 'Success', message: 'Camera created successfully', variant: 'success' });
            } else {
                let errorMessage = 'Failed to create camera';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) {
                    const text = await response.text();
                    errorMessage = text || errorMessage;
                }
                setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
            setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
        }
    };

    const handleUpdate = async (data: any) => {
        if (!editingCamera) return;
        console.log('CamerasPage: Updating camera with data:', data);
        console.log('CamerasPage: Editing camera ID:', editingCamera.id);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/cameras/${editingCamera.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            console.log('CamerasPage: Update response status:', response.status);

            if (response.ok) {
                const responseData = await response.json();
                console.log('CamerasPage: Update successful:', responseData);
                await fetchCameras();
                closeModal();
                setAlert({ isOpen: true, title: 'Success', message: 'Camera updated successfully', variant: 'success' });
            } else {
                let errorMessage = 'Failed to update camera';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (e) {
                    const text = await response.text();
                    errorMessage = text || errorMessage;
                }
                console.error('CamerasPage: Update failed:', errorMessage);
                setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
            }
        } catch (error) {
            console.error('CamerasPage: Update network error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
            setAlert({ isOpen: true, title: 'Error', message: errorMessage, variant: 'error' });
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, cameraId: id });
    };

    const handleDelete = async () => {
        if (!deleteConfirm.cameraId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/cameras/${deleteConfirm.cameraId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                await fetchCameras();
                setAlert({ isOpen: true, title: 'Success', message: 'Camera deleted successfully', variant: 'success' });
            } else {
                const error = await response.json();
                setAlert({ isOpen: true, title: 'Error', message: error.error || 'Failed to delete camera', variant: 'error' });
            }
        } catch (error) {
            setAlert({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', variant: 'error' });
        }
    };

    const openCreateModal = () => {
        console.log('CamerasPage: Opening create modal');
        setEditingCamera(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        console.log('CamerasPage: Closing modal');
        setIsModalOpen(false);
        setEditingCamera(null);
    };

    const openEditModal = (camera: any) => {
        console.log('CamerasPage: Opening edit modal for camera:', camera);
        setEditingCamera(camera);
        setIsModalOpen(true);
    };

    const printReport = async () => {
        const now = new Date();
        const dateStr = now.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
        const reportId = `RPT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
        const orgName = import.meta.env.VITE_ORG_NAME || 'Karnataka Forest Department';

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const printedBy = currentUser.full_name || currentUser.email || 'Unknown';
        const printedByRole = currentUser.role_name || currentUser.role || '';

        const activeFilters: string[] = [];
        if (searchQuery) activeFilters.push(`Search: "${searchQuery}"`);
        if (filterStatus !== 'all') activeFilters.push(`Status: ${filterStatus}`);
        if (filterDivision !== 'all') activeFilters.push(`Division: ${filterDivision}`);
        if (filterRange !== 'all') activeFilters.push(`Range: ${filterRange}`);
        if (filterBeat !== 'all') activeFilters.push(`Beat: ${filterBeat}`);
        if (filterBrand !== 'all') activeFilters.push(`Brand: ${filterBrand}`);

        // Per-division breakdown
        const divisionMap: Record<string, { active: number; maintenance: number; inactive: number; total: number }> = {};
        filteredCameras.forEach((cam: any) => {
            const div = cam.division_name || 'Unassigned';
            if (!divisionMap[div]) divisionMap[div] = { active: 0, maintenance: 0, inactive: 0, total: 0 };
            divisionMap[div].total++;
            if (cam.status === 'active') divisionMap[div].active++;
            else if (cam.status === 'maintenance') divisionMap[div].maintenance++;
            else divisionMap[div].inactive++;
        });
        const divisionRows = Object.entries(divisionMap)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([div, c], i) => `
            <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td style="font-weight:600;">${div}</td>
                <td class="tc"><span class="pill pill-active">${c.active}</span></td>
                <td class="tc"><span class="pill pill-maint">${c.maintenance}</span></td>
                <td class="tc"><span class="pill pill-inactive">${c.inactive}</span></td>
                <td class="tc"><strong>${c.total}</strong></td>
                <td style="padding:4px 8px;">
                  <div class="bar-wrap">
                    ${c.active > 0 ? `<div class="bar bar-a" style="width:${(c.active/c.total*100).toFixed(0)}%" title="Active: ${c.active}"></div>` : ''}
                    ${c.maintenance > 0 ? `<div class="bar bar-m" style="width:${(c.maintenance/c.total*100).toFixed(0)}%" title="Maintenance: ${c.maintenance}"></div>` : ''}
                    ${c.inactive > 0 ? `<div class="bar bar-i" style="width:${(c.inactive/c.total*100).toFixed(0)}%" title="Inactive: ${c.inactive}"></div>` : ''}
                  </div>
                </td>
                <td class="tc">
                  <span style="font-size:13px;font-weight:700;color:${c.active/c.total >= 0.8 ? '#15803d' : c.active/c.total >= 0.5 ? '#b45309' : '#b91c1c'}">${(c.active/c.total*100).toFixed(0)}%</span>
                </td>
            </tr>
        `).join('');

        const orphans = filteredCameras.filter((cam: any) => !cam.beat_name);
        const withNotes = filteredCameras.filter((cam: any) => cam.notes?.trim());

        // ── SUPPLEMENTAL DATA ──────────────────────────────────────
        const token = localStorage.getItem('accessToken');
        let allBeats: any[] = [];
        const activityMap: Record<string, { last_upload: string | null; image_count: number }> = {};
        try {
            const [beatsRes, activityRes] = await Promise.all([
                fetch('/api/geography/beats', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/cameras/activity',  { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (beatsRes.ok) allBeats = (await beatsRes.json()).beats || [];
            if (activityRes.ok) ((await activityRes.json()).activity || []).forEach((a: any) => { activityMap[a.camera_id] = a; });
        } catch (e) { console.warn('Supplemental report data fetch failed', e); }

        // Camera age analysis
        const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
        const ageOver1   = filteredCameras.filter((cam: any) => cam.install_date && (now.getTime() - new Date(cam.install_date).getTime()) > msPerYear).length;
        const ageOver2   = filteredCameras.filter((cam: any) => cam.install_date && (now.getTime() - new Date(cam.install_date).getTime()) > 2 * msPerYear).length;
        const ageOver3   = filteredCameras.filter((cam: any) => cam.install_date && (now.getTime() - new Date(cam.install_date).getTime()) > 3 * msPerYear).length;
        const ageUnknown = filteredCameras.filter((cam: any) => !cam.install_date).length;

        // Surveillance blind spots (beats with no camera assigned)
        const beatsWithCameras = new Set(cameras.map((cam: any) => cam.beat_name).filter(Boolean));
        const blindSpots = allBeats
            .filter((b: any) => {
                if (filterDivision !== 'all' && b.division_name !== filterDivision) return false;
                if (filterRange   !== 'all' && b.range_name   !== filterRange)   return false;
                return !beatsWithCameras.has(b.name);
            })
            .sort((a: any, z: any) => `${a.division_name}${a.range_name}${a.name}`.localeCompare(`${z.division_name}${z.range_name}${z.name}`));

        // Maintenance due list (sorted by days in maintenance descending)
        const maintenanceCams = filteredCameras
            .filter((cam: any) => cam.status === 'maintenance')
            .map((cam: any) => ({
                ...cam,
                daysSince: cam.updated_at
                    ? Math.floor((now.getTime() - new Date(cam.updated_at).getTime()) / 86400000)
                    : null,
            }))
            .sort((a: any, b: any) => (b.daysSince ?? 0) - (a.daysSince ?? 0));

        // Silent cameras — active cameras with no image uploaded in 30+ days
        const silentCameras = filteredCameras
            .filter((cam: any) => cam.status === 'active')
            .map((cam: any) => {
                const act = activityMap[cam.id];
                const lastDate = act?.last_upload ? new Date(act.last_upload) : null;
                const daysAgo  = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / 86400000) : null;
                return { ...cam, lastImageDate: lastDate, daysAgo, imageCount: act?.image_count ?? 0 };
            })
            .filter((cam: any) => cam.daysAgo === null || cam.daysAgo > 30)
            .sort((a: any, b: any) => (b.daysAgo ?? 9999) - (a.daysAgo ?? 9999));

        const rows = filteredCameras.map((cam: any, i: number) => {
            const location = [cam.division_name, cam.range_name, cam.beat_name].filter(Boolean);
            const locHtml = location.length > 0
                ? location.map((p: string, idx: number) => `<span class="loc-part loc-${idx}">${p}</span>`).join('<span class="loc-sep"> › </span>')
                : '<span class="unassigned">⚠ Unassigned</span>';
            return `
            <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}${!cam.beat_name ? ' row-orphan' : ''}">
                <td class="tc num-cell">${i + 1}</td>
                <td><strong>${cam.camera_name || '<span class="na">—</span>'}</strong></td>
                <td class="mono">${cam.camera_id}</td>
                <td>${cam.brand_name || '<span class="na">—</span>'}</td>
                <td>${cam.camera_model || '<span class="na">—</span>'}</td>
                <td class="mono">${cam.serial_number || '<span class="na">—</span>'}</td>
                <td class="loc-cell">${locHtml}</td>
                <td class="tc"><span class="badge badge-${cam.status}">${cam.status}</span></td>
                <td class="mono coord">${cam.latitude != null ? `${Number(cam.latitude).toFixed(5)},<br>${Number(cam.longitude).toFixed(5)}` : '<span class="na">—</span>'}</td>
                <td class="tc">${cam.install_date ? new Date(cam.install_date).toLocaleDateString('en-IN') : '<span class="na">—</span>'}</td>
                <td class="tc">${cam.updated_at ? new Date(cam.updated_at).toLocaleDateString('en-IN') : '<span class="na">—</span>'}</td>
                <td class="tc">${(() => { const a = activityMap[cam.id]; const lu = a?.last_upload ? new Date(a.last_upload) : null; return lu ? lu.toLocaleDateString('en-IN') + '<br><span style="font-size:8px;color:#9ca3af;">' + (a?.image_count ?? 0) + ' imgs</span>' : '<span class="na">—</span>'; })()}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${reportId} – WildVision Camera Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *, *::before, *::after {
      box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    :root {
      --green:      #15803d;
      --green-light:#dcfce7;
      --green-mid:  #86efac;
      --green-dark: #14532d;
      --amber:      #b45309;
      --amber-light:#fef3c7;
      --red:        #b91c1c;
      --red-light:  #fee2e2;
      --orange:     #ea580c;
      --orange-light:#fff7ed;
      --gray-50:    #f9fafb;
      --gray-100:   #f3f4f6;
      --gray-200:   #e5e7eb;
      --gray-400:   #9ca3af;
      --gray-700:   #374151;
      --gray-900:   #111827;
    }

    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 10.5px;
      color: var(--gray-900);
      background: #fff;
      padding: 0;
    }

    /* ── TOP BANNER ────────────────────────────────── */
    .banner {
      background: linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%);
      color: white;
      padding: 18px 28px 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
      overflow: hidden;
    }
    .banner::before {
      content: '🌿';
      font-size: 110px;
      position: absolute;
      right: 24px;
      top: -18px;
      opacity: 0.09;
      line-height: 1;
    }
    .banner-left h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .banner-left .org { font-size: 11px; opacity: 0.85; margin-top: 3px; }
    .banner-left .rpt-id {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #d1fae5;
      font-family: monospace;
      font-size: 10px;
      padding: 2px 9px;
      border-radius: 4px;
      margin-top: 7px;
      letter-spacing: 0.05em;
    }
    .banner-right {
      text-align: right;
      font-size: 10px;
      line-height: 1.9;
      opacity: 0.9;
    }
    .banner-right strong { opacity: 1; font-weight: 600; }

    /* ── BODY WRAPPER ──────────────────────────────── */
    .body-wrap { padding: 16px 28px 20px; }

    /* ── STAT CARDS ────────────────────────────────── */
    .stats-row { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .stat-card {
      flex: 1; min-width: 90px;
      border-radius: 8px;
      padding: 10px 14px;
      border: 1.5px solid;
      display: flex; flex-direction: column; align-items: center;
    }
    .stat-card .sc-num { font-size: 26px; font-weight: 700; line-height: 1; }
    .stat-card .sc-lbl { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
    .sc-total   { border-color: var(--gray-200); background: var(--gray-50); }
    .sc-total   .sc-num { color: var(--gray-900); } .sc-total .sc-lbl { color: var(--gray-400); }
    .sc-active  { border-color: var(--green-mid); background: var(--green-light); }
    .sc-active  .sc-num { color: var(--green); }  .sc-active .sc-lbl  { color: var(--green); }
    .sc-maint   { border-color: #fcd34d; background: var(--amber-light); }
    .sc-maint   .sc-num { color: var(--amber); }  .sc-maint .sc-lbl   { color: var(--amber); }
    .sc-inactive{ border-color: #fca5a5; background: var(--red-light); }
    .sc-inactive .sc-num { color: var(--red); }    .sc-inactive .sc-lbl{ color: var(--red); }
    .sc-unassigned { border-color: #fdba74; background: var(--orange-light); }
    .sc-unassigned .sc-num { color: var(--orange); } .sc-unassigned .sc-lbl { color: var(--orange); }

    /* ── FILTER BAR ────────────────────────────────── */
    .filter-bar {
      background: linear-gradient(90deg, #f0fdf4, #f9fafb);
      border: 1px solid var(--green-mid);
      border-left: 3px solid var(--green);
      border-radius: 6px;
      padding: 7px 12px;
      font-size: 10px;
      margin-bottom: 14px;
      color: var(--gray-700);
    }
    .filter-bar strong { color: var(--green-dark); }
    .filter-tag {
      display: inline-block;
      background: var(--green-light);
      border: 1px solid var(--green-mid);
      color: var(--green-dark);
      border-radius: 10px;
      padding: 1px 8px;
      margin: 0 2px;
      font-size: 9.5px;
      font-weight: 500;
    }

    /* ── SECTION TITLES ────────────────────────────── */
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 700;
      color: var(--green-dark);
      text-transform: uppercase; letter-spacing: 0.08em;
      margin: 18px 0 8px;
      padding-bottom: 5px;
      border-bottom: 2px solid var(--green-light);
    }
    .section-title::before {
      content: '';
      display: inline-block; width: 4px; height: 14px;
      background: var(--green);
      border-radius: 2px;
    }

    /* ── TABLES ────────────────────────────────────── */
    table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid var(--gray-200); }
    thead tr { background: linear-gradient(90deg, #14532d, #166534); }
    th {
      color: white; text-align: left;
      padding: 7px 9px;
      font-size: 9px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em;
      white-space: nowrap;
    }
    th.tc { text-align: center; }
    td { padding: 5px 9px; border-bottom: 1px solid var(--gray-200); vertical-align: middle; line-height: 1.4; }
    td.tc { text-align: center; }
    tr.row-even td   { background: #fff; }
    tr.row-odd td    { background: var(--gray-50); }
    tr.row-orphan td { background: var(--orange-light) !important; }
    tr:last-child td { border-bottom: none; }

    /* col classes */
    .num-cell  { color: var(--gray-400); font-size: 9.5px; width: 24px; }
    .mono      { font-family: 'Courier New', monospace; font-size: 9.5px; color: #374151; }
    .coord     { font-size: 9px; line-height: 1.5; }
    .na        { color: var(--gray-400); }

    /* location breadcrumb */
    .loc-cell  { font-size: 9.5px; }
    .loc-part  { font-weight: 500; }
    .loc-0 { color: #7c3aed; }
    .loc-1 { color: #1d4ed8; }
    .loc-2 { color: var(--green); }
    .loc-sep   { color: var(--gray-400); font-size: 8px; }
    .unassigned { color: var(--orange); font-weight: 600; font-size: 9.5px; }

    /* status badges */
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .badge-active   { background: var(--green-light); color: var(--green); border: 1px solid var(--green-mid); }
    .badge-maintenance { background: var(--amber-light); color: var(--amber); border: 1px solid #fcd34d; }
    .badge-inactive { background: var(--red-light); color: var(--red); border: 1px solid #fca5a5; }

    /* division pills */
    .pill { display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 9px; font-weight: 700; }
    .pill-active   { background: var(--green-light); color: var(--green); }
    .pill-maint    { background: var(--amber-light); color: var(--amber); }
    .pill-inactive { background: var(--red-light); color: var(--red); }

    /* mini bar chart */
    .bar-wrap { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--gray-100); min-width: 80px; }
    .bar { height: 100%; }
    .bar-a { background: var(--green); }
    .bar-m { background: #f59e0b; }
    .bar-i { background: #ef4444; }

    /* notes */
    .notes-table td:first-child { width: 170px; font-family: 'Courier New', monospace; font-size: 9.5px; color: var(--green-dark); font-weight: 600; background: var(--green-light); border-right: 2px solid var(--green-mid); }
    .notes-table td:last-child  { color: var(--gray-700); font-style: italic; }

    /* warning note */
    .warn-note { font-size: 9px; color: var(--orange); margin-top: 6px; display: flex; align-items: center; gap: 5px; }

    /* ── AGE ANALYSIS CARDS ────────────────────────── */
    .age-row { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
    .age-card { flex:1; min-width:90px; border-radius:8px; padding:9px 12px; border:1.5px solid; display:flex; flex-direction:column; align-items:center; }
    .age-card .ac-num { font-size:22px; font-weight:700; line-height:1; }
    .age-card .ac-lbl { font-size:8.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-top:3px; text-align:center; }
    .age-1yr { border-color:#fcd34d; background:#fef9c3; } .age-1yr .ac-num,.age-1yr .ac-lbl { color:#92400e; }
    .age-2yr { border-color:#fdba74; background:#fff7ed; } .age-2yr .ac-num,.age-2yr .ac-lbl { color:#c2410c; }
    .age-3yr { border-color:#fca5a5; background:#fee2e2; } .age-3yr .ac-num,.age-3yr .ac-lbl { color:#b91c1c; }
    .age-unk  { border-color:#d1d5db; background:#f9fafb; } .age-unk  .ac-num,.age-unk  .ac-lbl { color:#6b7280; }

    /* ── STATUS DURATION BADGES ────────────────────── */
    .days-badge { display:inline-block; padding:1px 7px; border-radius:8px; font-size:9px; font-weight:700; white-space:nowrap; }
    .days-warn  { background:#fef3c7; color:#b45309; border:1px solid #fcd34d; }
    .days-alert { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }
    .days-ok    { background:#dcfce7; color:#15803d; border:1px solid #86efac; }

    /* ── SIGNATURE BLOCK ───────────────────────────── */
    .sig-block { margin-top:28px; border-top:2px solid var(--gray-200); padding-top:18px; page-break-inside:avoid; }
    .sig-row   { display:flex; gap:0; margin-top:30px; }
    .sig-cell  { flex:1; border-top:1.5px solid var(--gray-900); padding-top:6px; margin-right:24px; font-size:9px; }
    .sig-cell:last-child { margin-right:0; }
    .sig-label { font-weight:700; font-size:9px; text-transform:uppercase; letter-spacing:0.05em; color:var(--gray-900); }
    .sig-sub   { color:var(--gray-400); font-size:8px; margin-top:2px; }

    /* orientation hint – screen only */
    .orient-hint {
      background: #fffbeb; border: 1px solid #fbbf24; border-left: 4px solid #f59e0b;
      color: #92400e; font-size: 11px; font-weight: 500;
      padding: 8px 14px; border-radius: 5px; margin: 12px 28px 0;
      display: flex; align-items: center; gap: 8px;
    }
    @media print { .orient-hint { display: none !important; } }

    /* ── FOOTER ────────────────────────────────────── */
    .report-footer {
      background: linear-gradient(90deg, #f9fafb, #f0fdf4);
      border-top: 2px solid var(--green-light);
      margin-top: 20px;
      padding: 8px 28px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 9px; color: var(--gray-400);
    }
    .report-footer .left { display: flex; flex-direction: column; gap: 2px; }
    .report-footer .right { text-align: right; }
    .report-footer strong { color: var(--gray-700); }

    /* ── PRINT ─────────────────────────────────────── */
    @page { margin: 10mm 8mm; }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .banner {
        background: linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%) !important;
        color: white !important;
      }
      .banner-left h1, .banner-left .org, .banner-left .rpt-id,
      .banner-right, .banner-right * { color: white !important; }
      .banner::before { display: none; }
      thead tr { background: linear-gradient(90deg, #14532d, #166534) !important; }
      th { color: white !important; background: #14532d !important; }
      .sc-active  { background: #dcfce7 !important; }
      .sc-maint   { background: #fef3c7 !important; }
      .sc-inactive{ background: #fee2e2 !important; }
      .sc-unassigned { background: #fff7ed !important; }
      .sc-total   { background: #f9fafb !important; }
      .filter-bar { background: #f0fdf4 !important; }
      .filter-tag { background: #dcfce7 !important; }
      .badge-active      { background: #dcfce7 !important; color: #15803d !important; }
      .badge-maintenance { background: #fef3c7 !important; color: #b45309 !important; }
      .badge-inactive    { background: #fee2e2 !important; color: #b91c1c !important; }
      .pill-active   { background: #dcfce7 !important; color: #15803d !important; }
      .pill-maint    { background: #fef3c7 !important; color: #b45309 !important; }
      .pill-inactive { background: #fee2e2 !important; color: #b91c1c !important; }
      .bar-a { background: #15803d !important; }
      .bar-m { background: #f59e0b !important; }
      .bar-i { background: #ef4444 !important; }
      .bar-wrap { background: #f3f4f6 !important; }
      .notes-table td:first-child { background: #dcfce7 !important; }
      .report-footer { background: #f0fdf4 !important; }
      tr.row-even td   { background: #fff !important; }
      tr.row-odd td    { background: #f9fafb !important; }
      tr.row-orphan td { background: #fff7ed !important; }
      .section-title::before { background: #15803d !important; }
      .age-1yr { background: #fef9c3 !important; }
      .age-2yr { background: #fff7ed !important; }
      .age-3yr { background: #fee2e2 !important; }
      .age-unk  { background: #f9fafb !important; }
      .days-warn  { background: #fef3c7 !important; }
      .days-alert { background: #fee2e2 !important; }
      .days-ok    { background: #dcfce7 !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- ORIENTATION HINT (hidden on print) -->
  <div class="orient-hint">
    ⚠️ For best results: select <strong>Landscape</strong> orientation &nbsp;·&nbsp; uncheck <strong>Headers and footers</strong> in the print dialog to remove the browser URL line.
    <button onclick="window.print()" style="margin-left:auto;padding:5px 16px;background:#15803d;color:white;border:none;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;">🖨 Print / Save PDF</button>
  </div>

  <!-- BANNER -->
  <div class="banner">
    <div class="banner-left">
      <h1>🌿 WildVision &mdash; Surveillance Camera Report</h1>
      <div class="org">${orgName}</div>
      <div class="rpt-id">${reportId}</div>
    </div>
    <div class="banner-right">
      <div><strong>Generated:</strong> ${dateStr}</div>
      <div><strong>Printed by:</strong> ${printedBy}${printedByRole ? ` (${printedByRole})` : ''}</div>
      <div><strong>Cameras in report:</strong> ${filteredCameras.length} of ${cameras.length} total</div>
    </div>
  </div>

  <div class="body-wrap">

    <!-- STAT CARDS -->
    <div class="stats-row">
      <div class="stat-card sc-total">
        <div class="sc-num">${filteredCameras.length}</div>
        <div class="sc-lbl">Total Shown</div>
      </div>
      <div class="stat-card sc-active">
        <div class="sc-num">${activeCount}</div>
        <div class="sc-lbl">Active</div>
      </div>
      <div class="stat-card sc-maint">
        <div class="sc-num">${maintenanceCount}</div>
        <div class="sc-lbl">Maintenance</div>
      </div>
      <div class="stat-card sc-inactive">
        <div class="sc-num">${inactiveCount}</div>
        <div class="sc-lbl">Inactive</div>
      </div>
      ${orphans.length > 0 ? `
      <div class="stat-card sc-unassigned">
        <div class="sc-num">${orphans.length}</div>
        <div class="sc-lbl">Unassigned</div>
      </div>` : ''}
    </div>

    <!-- FILTER BAR -->
    <div class="filter-bar">
      ${activeFilters.length > 0
        ? `<strong>Filters applied:</strong>&nbsp; ${activeFilters.map(f => `<span class="filter-tag">${f}</span>`).join(' ')}`
        : `<strong>Scope:</strong>&nbsp; All cameras &mdash; no filters applied`}
    </div>

    <!-- DIVISION BREAKDOWN -->
    <div class="section-title">Division-wise Breakdown</div>
    <table style="width:auto;min-width:520px;">
      <thead>
        <tr>
          <th style="min-width:220px;">Division</th>
          <th class="tc" style="min-width:70px;">Active</th>
          <th class="tc" style="min-width:85px;">Maintenance</th>
          <th class="tc" style="min-width:70px;">Inactive</th>
          <th class="tc" style="min-width:55px;">Total</th>
          <th style="min-width:120px;">Distribution</th>
          <th class="tc" style="min-width:65px;">Health %</th>
        </tr>
      </thead>
      <tbody>${divisionRows}</tbody>
    </table>

    <!-- CAMERA INVENTORY -->
    <div class="section-title">Camera Inventory</div>
    <table>
      <thead>
        <tr>
          <th class="tc">#</th>
          <th>Camera Name</th>
          <th>Camera ID</th>
          <th>Brand</th>
          <th>Model</th>
          <th>Serial No.</th>
          <th>Location (Division › Range › Beat)</th>
          <th class="tc">Status</th>
          <th class="tc">Coordinates</th>
          <th class="tc">Installed</th>
          <th class="tc">Last Updated</th>
          <th class="tc">Last Image</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${orphans.length > 0 ? `
    <div class="warn-note">
      ⚠&nbsp; <span>Rows highlighted in orange indicate cameras not assigned to a beat.</span>
    </div>` : ''}

    <!-- FIELD NOTES -->
    ${withNotes.length > 0 ? `
    <div class="section-title">Field Notes</div>
    <table class="notes-table">
      <thead>
        <tr>
          <th style="width:170px;">Camera ID</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${withNotes.map((cam: any, i: number) => `
          <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
            <td>${cam.camera_id}</td>
            <td>${cam.notes}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- CAMERA AGE ANALYSIS -->
    <div class="section-title">Camera Age Analysis</div>
    <div style="font-size:9.5px;color:#6b7280;margin-bottom:8px;">Older cameras may require battery replacement, SD card servicing, or hardware checks. Based on recorded installation date.</div>
    <div class="age-row">
      <div class="age-card age-1yr">
        <div class="ac-num">${ageOver1}</div>
        <div class="ac-lbl">Over 1 Year</div>
      </div>
      <div class="age-card age-2yr">
        <div class="ac-num">${ageOver2}</div>
        <div class="ac-lbl">Over 2 Years</div>
      </div>
      <div class="age-card age-3yr">
        <div class="ac-num">${ageOver3}</div>
        <div class="ac-lbl">Over 3 Years</div>
      </div>
      <div class="age-card age-unk">
        <div class="ac-num">${ageUnknown}</div>
        <div class="ac-lbl">No Install Date</div>
      </div>
    </div>

    <!-- SURVEILLANCE BLIND SPOTS -->
    ${blindSpots.length > 0 ? `
    <div class="section-title">Surveillance Blind Spots (${blindSpots.length} beat${blindSpots.length !== 1 ? 's' : ''})</div>
    <div style="font-size:9.5px;color:#b91c1c;margin-bottom:8px;">⚠ The following beats have no cameras deployed. These are unmonitored areas within the current scope.</div>
    <table>
      <thead>
        <tr>
          <th class="tc">#</th>
          <th>Beat</th>
          <th>Range</th>
          <th>Division</th>
        </tr>
      </thead>
      <tbody>
        ${blindSpots.map((b: any, i: number) => `
          <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
            <td class="tc num-cell">${i + 1}</td>
            <td style="font-weight:600;color:#b91c1c;">${b.name}</td>
            <td>${b.range_name || '<span class="na">—</span>'}</td>
            <td>${b.division_name || '<span class="na">—</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : `
    <div class="section-title">Surveillance Blind Spots</div>
    <div style="font-size:9.5px;color:#15803d;padding:6px 0 12px;">✓ All beats in scope have at least one camera deployed — no blind spots detected.</div>
    `}

    <!-- MAINTENANCE DUE LIST -->
    ${maintenanceCams.length > 0 ? `
    <div class="section-title">Maintenance Due List (${maintenanceCams.length} camera${maintenanceCams.length !== 1 ? 's' : ''})</div>
    <div style="font-size:9.5px;color:#b45309;margin-bottom:8px;">Cameras currently in maintenance status, sorted by duration (longest first). Duration estimated from last record update.</div>
    <table>
      <thead>
        <tr>
          <th class="tc">#</th>
          <th>Camera ID</th>
          <th>Camera Name</th>
          <th>Location</th>
          <th class="tc">Days in Maintenance</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${maintenanceCams.map((cam: any, i: number) => {
            const loc = [cam.division_name, cam.range_name, cam.beat_name].filter(Boolean).join(' › ');
            const dCls = (cam.daysSince ?? 0) > 14 ? 'days-alert' : 'days-warn';
            return `
          <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
            <td class="tc num-cell">${i + 1}</td>
            <td class="mono">${cam.camera_id}</td>
            <td><strong>${cam.camera_name || '<span class="na">—</span>'}</strong></td>
            <td class="loc-cell">${loc || '<span class="unassigned">⚠ Unassigned</span>'}</td>
            <td class="tc"><span class="days-badge ${dCls}">${cam.daysSince !== null ? cam.daysSince + 'd' : '—'}</span></td>
            <td style="font-style:italic;color:#6b7280;font-size:9px;">${cam.notes || ''}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- SILENT CAMERAS -->
    ${silentCameras.length > 0 ? `
    <div class="section-title">Silent Cameras — No Recent Activity (${silentCameras.length})</div>
    <div style="font-size:9.5px;color:#b91c1c;margin-bottom:8px;">Active cameras with no image uploaded in the last 30 days, or with no images on record. These may be offline or malfunctioning.</div>
    <table>
      <thead>
        <tr>
          <th class="tc">#</th>
          <th>Camera ID</th>
          <th>Camera Name</th>
          <th>Location</th>
          <th class="tc">Last Image</th>
          <th class="tc">Days Silent</th>
          <th class="tc">Total Images</th>
        </tr>
      </thead>
      <tbody>
        ${silentCameras.map((cam: any, i: number) => {
            const loc = [cam.division_name, cam.range_name, cam.beat_name].filter(Boolean).join(' › ');
            const dCls = (cam.daysAgo === null || cam.daysAgo > 60) ? 'days-alert' : 'days-warn';
            return `
          <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
            <td class="tc num-cell">${i + 1}</td>
            <td class="mono">${cam.camera_id}</td>
            <td><strong>${cam.camera_name || '<span class="na">—</span>'}</strong></td>
            <td class="loc-cell">${loc || '<span class="unassigned">⚠ Unassigned</span>'}</td>
            <td class="tc mono" style="font-size:9px;">${cam.lastImageDate ? cam.lastImageDate.toLocaleDateString('en-IN') : '<span class="na">Never</span>'}</td>
            <td class="tc"><span class="days-badge ${dCls}">${cam.daysAgo !== null ? cam.daysAgo + 'd' : '∞'}</span></td>
            <td class="tc">${cam.imageCount}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- SIGNATURE BLOCK -->
    <div class="sig-block">
      <div class="section-title">Authorization &amp; Sign-off</div>
      <div style="font-size:9px;color:#6b7280;margin-bottom:4px;">This report is confidential and intended solely for authorized Forest Department personnel. To be signed by designated officers after review.</div>
      <div class="sig-row">
        <div class="sig-cell">
          <div class="sig-label">Prepared by</div>
          <div class="sig-sub">${printedBy}${printedByRole ? ' &middot; ' + printedByRole : ''}</div>
          <div class="sig-sub" style="margin-top:4px;">Date: _______________</div>
        </div>
        <div class="sig-cell">
          <div class="sig-label">Reviewed by</div>
          <div class="sig-sub">Range / Divisional Forest Officer</div>
          <div class="sig-sub" style="margin-top:4px;">Date: _______________</div>
        </div>
        <div class="sig-cell">
          <div class="sig-label">Approved by</div>
          <div class="sig-sub">Conservator of Forests</div>
          <div class="sig-sub" style="margin-top:4px;">Date: _______________</div>
        </div>
      </div>
    </div>

  </div><!-- /body-wrap -->

  <!-- FOOTER -->
  <div class="report-footer">
    <div class="left">
      <span><strong>WildVision</strong> Wildlife Surveillance Platform</span>
      <span>Confidential &mdash; For internal use only</span>
    </div>
    <div class="right">
      <div>Printed by: <strong>${printedBy}</strong></div>
      <div>Reference: <strong>${reportId}</strong></div>
    </div>
  </div>

  <script>
    window.onload = () => {
      setTimeout(() => window.print(), 300);
    };
  <\/script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank', 'width=1280,height=900');
        if (win) {
            // Revoke the blob URL after the window loads to free memory
            win.addEventListener('load', () => URL.revokeObjectURL(blobUrl));
        }
    };

    const activeCount = filteredCameras.filter((c: any) => c.status === 'active').length;
    const maintenanceCount = filteredCameras.filter((c: any) => c.status === 'maintenance').length;
    const inactiveCount = filteredCameras.filter((c: any) => c.status === 'inactive').length;

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Surveillance Units</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {loading ? 'Syncing...' : `${filteredCameras.length} of ${cameras.length} units ${searchQuery || filterStatus !== 'all' || filterDivision !== 'all' ? 'matching filters' : 'online'}`}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{activeCount}</div>
                                <div className="text-xs text-gray-500">Active</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-700">{maintenanceCount}</div>
                                <div className="text-xs text-gray-500">Maintenance</div>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-700">{inactiveCount}</div>
                                <div className="text-xs text-gray-500">Inactive</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={printReport}
                            variant="outline"
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                            title={isFiltered ? `Print ${filteredCameras.length} filtered cameras` : `Print all ${cameras.length} cameras`}
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Print Report
                            {isFiltered && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{filteredCameras.length}</span>}
                        </Button>
                        <Button
                            onClick={() => setShowDiagnostics(true)}
                            variant="outline"
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Diagnostics
                        </Button>
                        {cameras.length === 0 && (
                            <Button
                                onClick={() => {
                                    setTestMode(!testMode);
                                    if (!testMode) {
                                        setAlert({
                                            isOpen: true,
                                            title: 'Test Mode Enabled',
                                            message: 'Showing sample camera data for map testing',
                                            variant: 'success'
                                        });
                                    }
                                }}
                                variant="outline"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                <TestTube className="mr-2 h-4 w-4" />
                                {testMode ? 'Exit Test' : 'Test Map'}
                            </Button>
                        )}
                        <Button onClick={openCreateModal} className="bg-green-700 hover:bg-green-800">
                            <Plus className="mr-2 h-4 w-4" /> Add Camera
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search Box */}
                        <div className="flex-1 min-w-[220px] relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        {/* Division Filter */}
                        <select
                            value={filterDivision}
                            onChange={(e) => handleDivisionChange(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                        >
                            <option value="all">All Divisions</option>
                            {uniqueDivisions.map(div => (
                                <option key={div} value={div}>{div}</option>
                            ))}
                        </select>

                        {/* Range Filter (cascades from Division) */}
                        <select
                            value={filterRange}
                            onChange={(e) => handleRangeChange(e.target.value)}
                            disabled={uniqueRanges.length === 0}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="all">All Ranges</option>
                            {uniqueRanges.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>

                        {/* Beat Filter (cascades from Range) */}
                        <select
                            value={filterBeat}
                            onChange={(e) => setFilterBeat(e.target.value)}
                            disabled={uniqueBeats.length === 0}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="all">All Beats</option>
                            {uniqueBeats.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>

                        {/* Brand Filter */}
                        {uniqueBrands.length > 0 && (
                            <select
                                value={filterBrand}
                                onChange={(e) => setFilterBrand(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                            >
                                <option value="all">All Brands</option>
                                {uniqueBrands.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        )}

                        {/* Clear Filters + Results Info */}
                        {isFiltered && (
                            <>
                                <span className="text-sm text-gray-600 font-medium">
                                    {filteredCameras.length} {filteredCameras.length === 1 ? 'camera' : 'cameras'} found
                                </span>
                                <Button
                                    onClick={clearFilters}
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-300 text-gray-700"
                                >
                                    <X className="mr-1 h-4 w-4" />
                                    Clear
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
                <button
                    onClick={() => setActiveTab('map')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'map'
                            ? 'border-green-700 text-green-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <Map size={16} />
                    Map View
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'list'
                            ? 'border-green-700 text-green-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                    <List size={16} />
                    List View
                </button>
            </div>

            {/* Map Tab */}
            {activeTab === 'map' && (
            <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm relative" style={{ minHeight: '480px' }}>
                <MapComponent
                    cameras={testMode && cameras.length === 0 ? defaultTestCameras : filteredCameras}
                />
                {testMode && cameras.length === 0 && (
                    <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                        <div className="flex items-center gap-2">
                            <TestTube size={16} />
                            <span className="font-medium">Test Mode Active</span>
                        </div>
                        <p className="text-xs mt-1">Showing sample camera locations</p>
                    </div>
                )}
            </div>
            )}

            {/* List Tab */}
            {activeTab === 'list' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3">Camera Name</th>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Brand</th>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCameras.map((cam: any) => (
                                <tr key={cam.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{cam.camera_name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{cam.camera_id}</td>
                                    <td className="px-6 py-4">{cam.brand_name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-600">{[cam.division_name, cam.range_name, cam.beat_name].filter(Boolean).join(' > ') || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cam.status === 'active' ? 'bg-green-100 text-green-800' :
                                            cam.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {cam.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => openEditModal(cam)}
                                            className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                                            title="Edit Camera"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setViewGalleryId(cam.id || cam.camera_id)}
                                            className="text-purple-600 hover:text-purple-800 p-1 bg-purple-50 rounded"
                                            title="View Gallery"
                                        >
                                            <ImageIcon size={16} />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(cam.id)}
                                            className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded"
                                            title="Delete Camera"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredCameras.length === 0 && cameras.length > 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <p className="mb-2">No cameras match your filters.</p>
                            <Button onClick={clearFilters} variant="outline" size="sm">
                                Clear Filters
                            </Button>
                        </div>
                    )}
                    {cameras.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No cameras found. Add one to get started.</div>
                    )}
                </div>
            </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingCamera ? 'Edit Camera' : 'Add New Camera'}
            >
                <CameraForm
                    initialData={editingCamera}
                    onSubmit={editingCamera ? handleUpdate : handleCreate}
                    onCancel={closeModal}
                />
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, cameraId: null })}
                onConfirm={handleDelete}
                title="Delete Camera"
                message="Are you sure you want to delete this camera? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            <AlertDialog
                isOpen={alert.isOpen}
                onClose={() => setAlert({ ...alert, isOpen: false })}
                title={alert.title}
                message={alert.message}
                variant={alert.variant}
            />

            {showDiagnostics && (
                <MapDiagnostics onClose={() => setShowDiagnostics(false)} />
            )}

            <CameraGallery
                cameraId={viewGalleryId || ''}
                cameraName={cameras.find(c => (c.id === viewGalleryId) || (c.camera_id === viewGalleryId))?.camera_name || 'Camera'}
                isOpen={!!viewGalleryId}
                onClose={() => setViewGalleryId(null)}
            />
        </div>
    );
}
