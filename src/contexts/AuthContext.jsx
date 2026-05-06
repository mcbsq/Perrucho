// src/contexts/AuthContext.jsx
// FIX 1: CORS PATCH — se resuelve en server.js (no aquí)
// FIX 2: register() crea entrada en /clients Y en /users con clientId vinculado
// FIX 3: tras register(), llama reloadClientsAndPets() del DataContext para que
//         el nuevo cliente aparezca en los dashboards sin recargar la página
// FIX 4 (CRÍTICO): register() ahora acepta petData como 2do argumento y crea
//         la mascota en /pets con ownerId = newClient.id. Antes Register.jsx
//         pasaba petData pero AuthContext.register lo ignoraba → la mascota
//         nunca se guardaba (causa raíz del feedback "no visualizaba las
//         mascotas agregadas").

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersApi, clientsApi, petsApi } from '../api/apiClient';

const AuthContext  = createContext();
const SESSION_KEY  = 'perrucho_session';

export const useAuth = () => useContext(AuthContext);

// dataReloadRef permite que AuthContext llame al DataContext sin dependencia
// circular — se inyecta desde App.jsx o desde un Provider wrapper.
// Si no está disponible, el admin/empleado verá el nuevo cliente tras recargar.
let _reloadClientsAndPets = null;
export const setDataReloader = (fn) => { _reloadClientsAndPets = fn; };

export const AuthProvider = ({ children }) => {
    const [user,    setUser]    = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Recuperar sesión ──────────────────────────────────────────────────────
    useEffect(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.id && parsed?.role) setUser(parsed);
                else sessionStorage.removeItem(SESSION_KEY);
            }
        } catch {
            sessionStorage.removeItem(SESSION_KEY);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (loading) return;
        if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        else      sessionStorage.removeItem(SESSION_KEY);
    }, [user, loading]);

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = async (email, password) => {
        try {
            const found = await usersApi.login(email, password);
            if (found) {
                const { password: _pw, ...safeUser } = found;
                setUser(safeUser);
                return safeUser;
            }
            return null;
        } catch (err) {
            console.error('Error en login:', err);
            throw new Error('No se pudo conectar con el servidor.');
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = () => {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
    };

    // ── Register ──────────────────────────────────────────────────────────────
    // 1. Crea entrada en /clients → aparece en lista de admin/empleado
    // 2. Crea usuario en /users con clientId vinculado
    // 3. Si viene petData, crea la mascota inicial en /pets con ownerId=clientId
    // 4. Recarga el DataContext para que los dashboards vean el nuevo cliente
    const register = async (clientData, petData = null) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            // Paso 1: crear registro de cliente
            const newClient = await clientsApi.create({
                name:      clientData.name    || clientData.email,
                email:     clientData.email,
                phone:     clientData.phone   || '',
                address:   clientData.address || '',
                createdAt: today,
            });

            // Paso 2: crear usuario con referencia al clientId
            const newUser = await usersApi.create({
                name:      clientData.name || clientData.email,
                email:     clientData.email,
                password:  clientData.password,
                role:      'cliente',
                clientId:  newClient.id,
                createdAt: today,
            });

            // Paso 3: si llegó petData, crear la mascota inicial.
            // El cliente del feedback dijo: "se crea el perfil y automáticamente
            // se procede a agregar los datos de la mascota. Sin embargo al entrar
            // a mi perfil no visualizaba las mascotas agregadas." — esto era
            // porque la mascota nunca se guardaba. Ahora sí.
            if (petData && (petData.petName || petData.name)) {
                await petsApi.create({
                    petName: petData.petName || petData.name,
                    species: petData.species || 'perro',
                    breed:   petData.breed   || '',
                    weight:  petData.weight  || '',
                    age:     petData.age     || '',
                    notes:   petData.notes   || '',
                    ownerId: newClient.id,
                    history: [],
                    createdAt: today,
                });
            }

            // Paso 4: loguear sin password
            const { password: _pw, ...safeUser } = newUser;
            const sessionUser = { ...safeUser, clientId: newClient.id };
            setUser(sessionUser);

            // Paso 5: notificar al DataContext para que recargue clients/pets
            // Esto hace que el nuevo cliente y mascota aparezcan en
            // admin/empleado de inmediato sin recargar página.
            if (_reloadClientsAndPets) {
                _reloadClientsAndPets().catch(() => {});
            }

            return sessionUser;
        } catch (err) {
            console.error('Error en registro:', err);
            throw new Error('No se pudo completar el registro. ¿Ya existe una cuenta con ese correo?');
        }
    };

    // ── Actualizar datos de sesión (para cambios de perfil) ───────────────────
    const updateSessionUser = (updatedFields) => {
        setUser(prev => ({ ...prev, ...updatedFields }));
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