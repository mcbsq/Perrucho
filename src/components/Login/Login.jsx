// src/components/Login/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import loginVideo from '../../assets/login.mp4'; // ← mismo video o uno distinto
import loginPoster from '../../assets/1.jpg';   // fallback mientras carga
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);

    const { login }  = useAuth();
    const navigate   = useNavigate();
    const location   = useLocation();

    // Si el usuario venía de una página protegida, lo regresamos ahí tras login
    const from = location.state?.from || null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const loggedUser = await login(email, password); // ← await corregido

            if (loggedUser) {
                // Prioridad: regresar a la página de origen si existe
                if (from) {
                    navigate(from, { replace: true });
                } else if (loggedUser.role === 'administrador') {
                    navigate('/admin-dashboard');
                } else if (loggedUser.role === 'empleado') {
                    navigate('/employee-dashboard');
                } else {
                    navigate('/');
                }
            } else {
                setError('Email o contraseña incorrectos.');
            }
        } catch (err) {
            setError('Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">

            {/* ── Video de fondo full-screen ── */}
            <video
                className="login-video-bg"
                autoPlay
                muted
                loop
                playsInline
                poster={loginPoster}
            >
                <source src={loginVideo} type="video/mp4" />
            </video>

            {/* ── Overlay oscuro sobre el video ── */}
            <div className="login-overlay" />

            {/* ── Formulario ── */}
            <div className="login-card">
                <div className="login-logo">🐾</div>
                <h2>Bienvenido</h2>
                <p className="login-subtitle">Inicia sesión para continuar</p>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
                    <Link to="/" className="login-back">← Volver al inicio</Link>
                </div>
            </div>

        </div>
    );
};

export default Login;