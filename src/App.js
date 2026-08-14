// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, setDataReloader, useAuth } from './contexts/AuthContext';
import { DataProvider, useData }         from './contexts/DataContext';
import Navbar            from './components/Navbar/Navbar';
import Footer            from './components/Footer/Footer';
import FloatingMenu      from './components/FloatingMenu/FloatingMenu';
import ProtectedRoute    from './components/ProtectedRoute';
import ForceChangePasswordModal from './components/shared/ForceChangePasswordModal';
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
import BusinessLayout    from './components/BusinessLayout';
import PerruchoLanding      from './pages/platform/PerruchoLanding';
import BusinessRegisterForm from './pages/platform/BusinessRegisterForm';
import SuperAdminLogin      from './pages/superadmin/SuperAdminLogin';
import SuperAdminPanel      from './pages/superadmin/SuperAdminPanel';

// Slug del único negocio que existía antes de multi-tenant — las URLs viejas
// sin prefijo (perrucho.com/servicios, etc.) redirigen aquí en vez de romper
// enlaces/bookmarks/QR ya publicados.
const LEGACY_BUSINESS_SLUG = 'taylors';

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

// El número/mensaje de WhatsApp del botón flotante deben ser del negocio
// actual, no de Taylor's fijo — bug real: todos los negocios mandaban a la
// gente al WhatsApp de Taylor's sin importar en qué sitio estuvieran.
const FloatingMenuBridge = () => {
    const { settings } = useData();
    const waNumber = settings?.whatsappNumber
        ? `52${settings.whatsappNumber.replace(/\D/g, '')}`
        : '5215633252525';
    const businessName = settings?.businessName || 'Perrucho';
    return (
        <FloatingMenu
            whatsappNumber={waNumber}
            whatsappMessage={`Hola, me interesa agendar una cita en ${businessName}.`}
        />
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const AppContent = () => {
    const location = useLocation();
    const { user } = useAuth();

    const isDashboard =
        location.pathname.startsWith('/admin-dashboard') ||
        location.pathname.startsWith('/employee-dashboard');

    // Las páginas públicas ahora viven bajo /:businessSlug/..., así que
    // "¿es una página de auth?" se decide por el último segmento de la ruta
    // en vez de una comparación exacta de path — funciona igual con o sin
    // el slug delante (/acceso legado, /taylors/acceso, /empresa2/acceso).
    const segments = location.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    const isAuthPage = !isDashboard && ['acceso', 'registro', 'olvide-contrasena'].includes(lastSegment);

    // La landing de la plataforma y el alta de negocio no son páginas de un
    // negocio (no tienen slug) — el Navbar de negocio no aplica ahí, cada
    // una trae su propio header.
    const isPlatformPage = location.pathname === '/' || location.pathname === '/crear-negocio'
        || location.pathname.startsWith('/superadmin');

    const hideGlobalUI = isDashboard || isAuthPage || isPlatformPage;

    return (
        <div className="app-container">
            {/* Bloquea toda la app, sin importar la ruta, hasta que se
                cambie la contraseña temporal — ver ForceChangePasswordModal. */}
            {user?.mustChangePassword && <ForceChangePasswordModal />}
            {!hideGlobalUI && <Navbar />}

            <main className={hideGlobalUI ? 'admin-main-content' : 'main-content'}>
                <Routes>
                    {/* ── Rutas públicas, aisladas por negocio ── */}
                    <Route path="/:businessSlug" element={<BusinessLayout />}>
                        <Route index                element={<Home />} />
                        <Route path="servicios"      element={<Services />} />
                        <Route path="tienda"         element={<Shop />} />
                        <Route path="sobre-nosotros" element={<SobreNosotros />} />
                        <Route path="acceso"         element={<Login />} />
                        <Route path="olvide-contrasena" element={<ForgotPassword />} />
                        <Route path="registro"       element={<Register />} />
                    </Route>

                    {/* ── Plataforma Perrucho (no es un negocio) ── */}
                    <Route path="/"               element={<PerruchoLanding />} />
                    <Route path="/crear-negocio"  element={<BusinessRegisterForm />} />
                    <Route path="/superadmin"        element={<SuperAdminLogin />} />
                    <Route path="/superadmin/panel"  element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <SuperAdminPanel />
                        </ProtectedRoute>
                    } />

                    {/* ── URLs sin slug (antes de multi-tenant) → Taylor's ── */}
                    <Route path="/servicios"       element={<Navigate to={`/${LEGACY_BUSINESS_SLUG}/servicios`} replace />} />
                    <Route path="/tienda"          element={<Navigate to={`/${LEGACY_BUSINESS_SLUG}/tienda`} replace />} />
                    <Route path="/sobre-nosotros"  element={<Navigate to={`/${LEGACY_BUSINESS_SLUG}/sobre-nosotros`} replace />} />
                    <Route path="/acceso"          element={<Navigate to={`/${LEGACY_BUSINESS_SLUG}/acceso`} replace />} />
                    <Route path="/olvide-contrasena" element={<Navigate to={`/${LEGACY_BUSINESS_SLUG}/olvide-contrasena`} replace />} />
                    <Route path="/registro"        element={<Navigate to={`/${LEGACY_BUSINESS_SLUG}/registro`} replace />} />

                    {/* ── Dashboards protegidos — sin prefijo: el JWT ya trae el businessId ── */}
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

                    {/* ── Fallback — a la plataforma, no a un negocio en particular ── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {!hideGlobalUI && (
                <>
                    <Footer />
                    <FloatingMenuBridge />
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