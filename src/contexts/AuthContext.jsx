// src/contexts/AuthContext.jsx
// Migrado de json-server a Express + Prisma + JWT
//
// Cambios clave vs versión anterior:
// - login() llama POST /api/login → recibe { token, user }
// - El token JWT se guarda en localStorage como 'perrucho_token'
// - register() llama POST /api/signup con usuario + mascota en una sola llamada
// - La sesión se restaura desde localStorage (token + user)
// - logout() limpia tanto el token como la sesión
// - users y clients ya son la misma tabla → register solo hace una llamada

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, petsApi } from '../api/apiClient';

const AuthContext  = createContext();
const SESSION_KEY  = 'perrucho_session';
const TOKEN_KEY    = 'perrucho_token';

export const useAuth = () => useContext(AuthContext);

// dataReloadRef permite que AuthContext llame al DataContext sin dependencia
// circular — se inyecta desde DataReloaderBridge o App.jsx
let _reloadClientsAndPets = null;
export const setDataReloader = (fn) => { _reloadClientsAndPets = fn; };

export const AuthProvider = ({ children }) => {
    const [user,    setUser]    = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Restaurar sesión desde localStorage ───────────────────────────────────
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SESSION_KEY);
            const token  = localStorage.getItem(TOKEN_KEY);
            if (stored && token) {
                const parsed = JSON.parse(stored);
                if (parsed?.id && parsed?.role) setUser(parsed);
                else clearSession();
            }
        } catch {
            clearSession();
        }
        setLoading(false);
    }, []);

    const clearSession = () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
    };

    const persistSession = (token, userData) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    };

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = async (email, password) => {
        try {
            const { token, user: userData } = await authApi.login(email, password);
            persistSession(token, userData);
            setUser(userData);
            return userData;
        } catch (err) {
            console.error('Error en login:', err);
            if (err.status === 401) throw new Error('Correo o contraseña incorrectos.');
            throw new Error('No se pudo conectar con el servidor.');
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = () => {
        setUser(null);
        clearSession();
    };

    // ── Register ──────────────────────────────────────────────────────────────
    // El nuevo backend unifica users + clients en una sola tabla.
    // POST /api/signup acepta { name, email, phone, password, pet? }
    // y crea el usuario + mascota en una sola transacción.
    const register = async (clientData, petData = null) => {
        try {
            const payload = {
                name:     clientData.name    || clientData.email,
                email:    clientData.email,
                phone:    clientData.phone   || '',
                password: clientData.password || 'perrucho123',
            };

            // Si viene mascota, la enviamos junto al registro
            if (petData && (petData.petName || petData.name)) {
                payload.pet = {
                    petName: petData.petName || petData.name,
                    species: petData.species || 'perro',
                    breed:   petData.breed   || '',
                    weight:  petData.weight  ? String(petData.weight) : '',
                    notes:   petData.notes   || '',
                };
            }

            const { token, user: userData } = await authApi.signup(payload);
            persistSession(token, userData);
            setUser(userData);

            // Notificar al DataContext para que recargue clients/pets
            if (_reloadClientsAndPets) {
                _reloadClientsAndPets().catch(() => {});
            }

            return userData;
        } catch (err) {
            console.error('Error en registro:', err);
            if (err.status === 409) throw new Error('Ya existe una cuenta con ese correo.');
            throw new Error('No se pudo completar el registro. Intenta de nuevo.');
        }
    };

    // ── Actualizar datos de sesión (para cambios de perfil) ───────────────────
    const updateSessionUser = (updatedFields) => {
        setUser(prev => {
            const updated = { ...prev, ...updatedFields };
            localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn: !!user,
            loading,
            login,
            logout,
            register,
            updateSessionUser,
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};