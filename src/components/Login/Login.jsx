// src/components/Login/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; 
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setError('');

        try {
            const user = login(email, password); 

            if (user) {
                // REDIRECCIÓN SEGÚN ROL
                if (user.role === 'administrador') navigate('/admin-dashboard');
                else if (user.role === 'empleado') navigate('/gestion-citas');
                else navigate('/'); 
            } else {
                setError('Credenciales incorrectas. (admin@mascotas.com / empleado@mascotas.com / test@mascotas.com)');
            }
        } catch (err) {
            setError('Ocurrió un error durante el inicio de sesión.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Iniciar Sesión</h2>
                <form onSubmit={handleSubmit}>
                    {error && <p className="error-message">{error}</p>} 
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Contraseña</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="login-button">Entrar</button>
                </form>
                <div className="login-footer">
                    <p>¿No tienes una cuenta? <Link to="/registro">Regístrate aquí</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;