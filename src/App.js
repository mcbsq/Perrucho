import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css'; 
import { AuthProvider } from './contexts/AuthContext'; 
import { DataProvider } from './contexts/DataContext'; 
import Navbar from './components/Navbar/Navbar'; 
import Footer from './components/Footer/Footer'; 
import WhatsAppButton from './components/WhatsAppButton/WhatsAppButton';
import ProtectedRoute from './components/ProtectedRoute'; 

// Importación de Páginas
import Home from './pages/Home';
import Services from './pages/Services'; 
import Shop from './pages/Shop'; 
import Contact from './pages/Contact'; 
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import AdminDashboard from './pages/admin/AdminDashboard'; 
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

const AppContent = () => {
  const location = useLocation();
  
  // Detectar si estamos en cualquier panel de gestión
  const isDashboardPath = 
    location.pathname.startsWith('/admin-dashboard') || 
    location.pathname.startsWith('/employee-dashboard');

  return (
    <div className="app-container">
        {/* Ocultar elementos públicos en dashboards */}
        {!isDashboardPath && <Navbar />}

        <main className={isDashboardPath ? "admin-main-content" : "main-content"}>
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/acceso" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/contacto" element={<Contact />} />

                {/* Servicios y Tienda */}
                <Route path="/servicios" element={
                    <ProtectedRoute allowedRoles={['cliente', 'administrador', 'empleado']}>
                      <Services />
                    </ProtectedRoute>
                } />

                <Route path="/tienda" element={
                    <ProtectedRoute allowedRoles={['cliente', 'administrador', 'empleado']}>
                      <Shop />
                    </ProtectedRoute>
                } />

                {/* Dashboard Admin */}
                <Route path="/admin-dashboard" element={
                    <ProtectedRoute allowedRoles={['administrador']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                } />

                {/* Dashboard Empleado (Ruta Crítica) */}
                <Route path="/employee-dashboard" element={
                    <ProtectedRoute allowedRoles={['empleado']}>
                        <EmployeeDashboard />
                    </ProtectedRoute>
                } />

                {/* Otras Rutas */}
                <Route path="/gestion-citas" element={
                    <ProtectedRoute allowedRoles={['empleado', 'administrador']}>
                      <div style={{padding: '100px'}}><h2>Gestión de Citas</h2></div>
                    </ProtectedRoute>
                } />

                <Route path="/perfil" element={
                    <ProtectedRoute>
                        <div style={{padding: '100px'}}><h2>Mi Perfil</h2></div>
                    </ProtectedRoute>
                } />
            </Routes>
        </main>
        
        {!isDashboardPath && <Footer />} 
        {!isDashboardPath && <WhatsAppButton />}
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