// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
        setLoading(false);
    }, [user]);

    // Función de Login con Roles
    const login = (email, password) => {
        // --- SIMULACIÓN DE CUENTAS MAESTRAS ---
        let role = 'cliente';
        if (email === "admin@mascotas.com") role = 'administrador';
        else if (email === "empleado@mascotas.com") role = 'empleado';

        if (password === "123456") {
            const userData = { 
                id: Date.now(), 
                name: role.charAt(0).toUpperCase() + role.slice(1), 
                email,
                role: role 
            };
            setUser(userData);
            return userData; // Retornamos el usuario para la redirección en el componente
        }
        return null;
    };

    const logout = () => {
        setUser(null);
    };

    const register = (clientData, petData) => {
        console.log("Registrando Cliente:", clientData);
        console.log("Registrando Mascota:", petData);
        
        const newUser = { 
            id: `u${Date.now()}`, 
            ...clientData,
            role: 'cliente' // Los registros web siempre son clientes
        };
        setUser(newUser); 
        return true;
    };

    const value = {
        user,
        isLoggedIn: !!user,
        login,
        logout,
        register,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};