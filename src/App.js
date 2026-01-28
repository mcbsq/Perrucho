// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css'; 

import { AuthProvider } from './contexts/AuthContext'; 
import { DataProvider } from './contexts/DataContext'; 
import Navbar from './components/Navbar/Navbar'; 
import Footer from './components/Footer/Footer'; 
import WhatsAppButton from './components/WhatsAppButton/WhatsAppButton';
import ProtectedRoute from './components/ProtectedRoute'; 

import Home from './pages/Home';
import Services from './pages/Services'; 
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import AdminDashboard from './pages/admin/AdminDashboard'; 

// Componente Wrapper para manejar la visibilidad de elementos globales
const AppContent = () => {
  const location = useLocation();
  
  // Verificamos si la ruta actual es el dashboard de administración
  const isAdminPath = location.pathname.startsWith('/admin-dashboard');

  return (
    <div className="app-container">
        {/* Solo mostramos Navbar, Footer y WhatsApp si NO estamos en el panel de admin */}
        {!isAdminPath && <Navbar />}

        <main className={isAdminPath ? "admin-main-content" : "main-content"}>
            <Routes>
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/acceso" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                
                <Route path="/servicios" element={
                    <ProtectedRoute allowedRoles={['cliente', 'administrador', 'empleado']}>
                      <Services />
                    </ProtectedRoute>
                } />

                <Route path="/admin-dashboard" element={
                    <ProtectedRoute allowedRoles={['administrador']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/gestion-citas" element={
                    <ProtectedRoute allowedRoles={['empleado', 'administrador']}>
                      <div style={{padding: '100px'}}><h2>Gestión de Citas</h2></div>
                    </ProtectedRoute>
                } />

                <Route path="/perfil" element={
                    <ProtectedRoute><div style={{padding: '100px'}}><h2>Mi Perfil</h2></div></ProtectedRoute>
                } />
            </Routes>
        </main>
        
        {!isAdminPath && <Footer />} 
        {!isAdminPath && <WhatsAppButton />}
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