import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CamerasPage from './pages/CamerasPage';
import UsersPage from './pages/UsersPage';
import UploadPage from './pages/UploadPage';
import GeographyPage from './pages/GeographyPage';
import WildlifeMapPage from './pages/WildlifeMapPage';
import MapTestPage from './pages/MapTestPage';
import AnimalActivityLog from './pages/AnimalActivityLog';
import AdminReviewPage from './pages/AdminReviewPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/map-test" element={<MapTestPage />} />

                {/* Protected Dashboard Layout */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/cameras" element={<CamerasPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/admin/review" element={<AdminReviewPage />} />
                    <Route path="/geography" element={
                        <ErrorBoundary>
                            <GeographyPage />
                        </ErrorBoundary>
                    } />
                    <Route path="/map" element={<WildlifeMapPage />} />
                    <Route path="/activity-log" element={<AnimalActivityLog />} />
                </Route>

                {/* Default redirects */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
