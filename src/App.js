// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider }  from './contexts/AuthContext';
import { DataProvider }  from './contexts/DataContext';
import Navbar            from './components/Navbar/Navbar';
import Footer            from './components/Footer/Footer';
import WhatsAppButton    from './components/WhatsAppButton/WhatsAppButton';
import Chatbot           from './components/Chatbot/Chatbot';
import ProtectedRoute    from './components/ProtectedRoute';

// ── Páginas ───────────────────────────────────────────────────────────────────
import Home             from './pages/Home';
import Services         from './pages/Services';
import Shop             from './pages/Shop';
import Contact          from './pages/Contact';
import Login            from './components/Login/Login';
import Register         from './components/Register/Register';
import AdminDashboard   from './pages/admin/AdminDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import Perfil           from './pages/cliente/Perfil';

const AppContent = () => {
    const location = useLocation();

    const isDashboard =
        location.pathname.startsWith('/admin-dashboard') ||
        location.pathname.startsWith('/employee-dashboard');

    const isAuthPage =
        location.pathname === '/acceso' ||
        location.pathname === '/registro';

    const hideGlobalUI = isDashboard || isAuthPage;

    return (
        <div className="app-container">
            {!hideGlobalUI && <Navbar />}

            <main className={hideGlobalUI ? 'admin-main-content' : 'main-content'}>
                <Routes>
                    {/* ── Rutas públicas ── */}
                    <Route path="/"          element={<Home />} />
                    <Route path="/servicios" element={<Services />} />
                    <Route path="/tienda"    element={<Shop />} />
                    <Route path="/contacto"  element={<Contact />} />
                    <Route path="/acceso"    element={<Login />} />
                    <Route path="/registro"  element={<Register />} />

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

            {/* Elementos flotantes — solo en páginas públicas */}
            {!hideGlobalUI && (
                <>
                    <Footer />
                    <WhatsAppButton />
                    <Chatbot />
                </>
            )}
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <DataProvider>
                <Router>
                    <AppContent />
                </Router>
            </DataProvider>
        </AuthProvider>
    );
}

export default App;