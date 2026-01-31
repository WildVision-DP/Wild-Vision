import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CamerasPage from './pages/CamerasPage';
import UsersPage from './pages/UsersPage';
import GeographyPage from './pages/GeographyPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />} />

                {/* Protected Dashboard Layout */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/cameras" element={<CamerasPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/geography" element={
                        <ErrorBoundary>
                            <GeographyPage />
                        </ErrorBoundary>
                    } />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
