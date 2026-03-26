// src/contexts/AuthContext.jsx
// Auth migrado a JSON Server.
// Login consulta la colección /users en db.json.
// Register crea un nuevo usuario con rol 'cliente'.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersApi } from '../api/apiClient';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Recuperar sesión del localStorage al arrancar
  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* sesión corrupta, ignorar */ }
    }
    setLoading(false);
  }, []);

  // Sincronizar sesión en localStorage cuando cambie el usuario
  useEffect(() => {
    if (!loading) {
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('currentUser');
      }
    }
  }, [user, loading]);

  // ── Login ────────────────────────────────────────────────────────────────
  // Consulta JSON Server: GET /users?email=...&password=...
  const login = async (email, password) => {
    try {
      const found = await usersApi.login(email, password);
      if (found) {
        // No guardamos la contraseña en el estado de sesión
        const { password: _pw, ...safeUser } = found;
        setUser(safeUser);
        return safeUser;
      }
      return null; // credenciales incorrectas
    } catch (err) {
      console.error('Error en login:', err);
      throw new Error('No se pudo conectar con el servidor.');
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
  };

  // ── Register ─────────────────────────────────────────────────────────────
  // Crea usuario con rol 'cliente' en JSON Server y lo loguea automáticamente
  const register = async (clientData) => {
    try {
      const newUser = await usersApi.create({
        ...clientData,
        role: 'cliente',
        createdAt: new Date().toISOString().split('T')[0],
      });
      const { password: _pw, ...safeUser } = newUser;
      setUser(safeUser);
      return safeUser;
    } catch (err) {
      console.error('Error en registro:', err);
      throw new Error('No se pudo completar el registro.');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      loading,
      login,
      logout,
      register,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};