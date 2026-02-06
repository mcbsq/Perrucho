import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

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

    const login = (email, password) => {
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
            return userData; 
        }
        return null;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser'); // Forzar borrado
    };

    const register = (clientData, petData) => {
        const newUser = { id: `u${Date.now()}`, ...clientData, role: 'cliente' };
        setUser(newUser); 
        return true;
    };

    return (
        <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, logout, register, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};