// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, setDataReloader } from './contexts/AuthContext';
import { DataProvider, useData }         from './contexts/DataContext';
import Navbar            from './components/Navbar/Navbar';
import Footer            from './components/Footer/Footer';
import FloatingMenu      from './components/FloatingMenu/FloatingMenu';
import ProtectedRoute    from './components/ProtectedRoute';
import { applyBrandColor, applyBrandSecondaryColor, applyFontFamily } from './utils/theme';

// ── Páginas ───────────────────────────────────────────────────────────────────
import Home              from './pages/Home';
import Services          from './pages/Services';
import Shop              from './pages/Shop';
import Contact           from './pages/Contact';
import SobreNosotros     from './pages/SobreNosotros';
import Login             from './components/Login/Login';
import ForgotPassword    from './components/Login/ForgotPassword';
import Register          from './components/Register/Register';
import AdminDashboard    from './pages/admin/AdminDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import Perfil            from './pages/cliente/Perfil';

// ── Puente AuthContext ↔ DataContext ─────────────────────────────────────────
const DataReloaderBridge = () => {
    const { reload } = useData();
    useEffect(() => {
        setDataReloader(reload);
        return () => setDataReloader(null);
    }, [reload]);
    return null;
};

// Aplica el color de marca configurado en Personalización a toda la app
// (bug reportado: el color elegido no generaba ningún cambio en la interfaz).
const BrandThemeBridge = () => {
    const { settings } = useData();
    useEffect(() => {
        applyBrandColor(settings?.primaryColor);
    }, [settings?.primaryColor]);
    useEffect(() => {
        applyBrandSecondaryColor(settings?.secondaryColor);
    }, [settings?.secondaryColor]);
    useEffect(() => {
        applyFontFamily(settings?.fontFamily);
    }, [settings?.fontFamily]);
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────

const AppContent = () => {
    const location = useLocation();

    const isDashboard =
        location.pathname.startsWith('/admin-dashboard') ||
        location.pathname.startsWith('/employee-dashboard');

    const isAuthPage =
        location.pathname === '/acceso' ||
        location.pathname === '/registro' ||
        location.pathname === '/olvide-contrasena';

    const hideGlobalUI = isDashboard || isAuthPage;

    return (
        <div className="app-container">
            {!hideGlobalUI && <Navbar />}

            <main className={hideGlobalUI ? 'admin-main-content' : 'main-content'}>
                <Routes>
                    {/* ── Rutas públicas ── */}
                    <Route path="/"                element={<Home />} />
                    <Route path="/servicios"       element={<Services />} />
                    <Route path="/tienda"          element={<Shop />} />
                    <Route path="/sobre-nosotros"  element={<SobreNosotros />} />
                    <Route path="/acceso"          element={<Login />} />
                    <Route path="/olvide-contrasena"      element={<ForgotPassword />} />
                    <Route path="/registro"        element={<Register />} />

                    {/* ── Dashboards protegidos ── */}
                    <Route path="/admin-dashboard/*" element={
                        <ProtectedRoute allowedRoles={['administrador']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/employee-dashboard/*" element={
                        <ProtectedRoute allowedRoles={['empleado']}>
                            <EmployeeDashboard />
                        </ProtectedRoute>
                    } />

                    {/* ── Perfil ── */}
                    <Route path="/perfil" element={
                        <ProtectedRoute allowedRoles={['cliente', 'administrador', 'empleado']}>
                            <Perfil />
                        </ProtectedRoute>
                    } />

                    {/* ── Fallback ── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {!hideGlobalUI && (
                <>
                    <Footer />
                    <FloatingMenu
                        whatsappNumber="5215633252525"
                        whatsappMessage="Hola, me interesa agendar una cita para mi mascota en Taylor's Pet Services."
                    />
                </>
            )}
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <DataProvider>
                <DataReloaderBridge />
                <BrandThemeBridge />
                <Router>
                    <AppContent />
                </Router>
            </DataProvider>
        </AuthProvider>
    );
}

export default App;