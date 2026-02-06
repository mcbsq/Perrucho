import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, isLoggedIn, loading } = useAuth();
    const location = useLocation();
  
    // 1. Mientras se verifica la sesión en LocalStorage
    if (loading) {
        return (
            <div className="loading-screen" style={{
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontFamily: 'Quicksand'
            }}>
                <div className="loader">Cargando perfil...</div>
            </div>
        );
    }

    // 2. Si no está logueado, al login
    // Guardamos 'state' para que tras loguearse vuelva a donde intentaba entrar
    if (!isLoggedIn) {
        return <Navigate to="/acceso" state={{ from: location }} replace />;
    }

    // 3. Validación de Roles
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`Acceso denegado para el rol: ${user.role}`);
        
        // Redirección inteligente según quién sea el intruso:
        if (user.role === 'administrador') return <Navigate to="/admin-dashboard" replace />;
        if (user.role === 'empleado') return <Navigate to="/employee-dashboard" replace />;
        
        // Si es cliente intentando entrar a un dashboard, al home:
        return <Navigate to="/" replace />; 
    }

    // 4. Si todo está en orden, renderiza el dashboard o la página
    return children;
};

export default ProtectedRoute;