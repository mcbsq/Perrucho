// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoggedIn, loading } = useAuth();
  
  if (loading) return null; // O un spinner de carga

  if (!isLoggedIn) {
    return <Navigate to="/acceso" replace />;
  }

  // Si se definieron roles permitidos y el usuario no tiene el rol necesario
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; 
  }

  return children;
};

export default ProtectedRoute;