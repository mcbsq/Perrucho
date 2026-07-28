// src/components/Login/ResetPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';
import loginVideo from '../../assets/login.mp4';
import loginPoster from '../../assets/1.jpg';
import { authApi } from '../../api/apiClient';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const [password,        setPassword]        = useState('');
    const [confirmPassword, setConfirmPassword]  = useState('');
    const [loading,         setLoading]          = useState(false);
    const [done,            setDone]             = useState(false);
    const [error,           setError]            = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
        if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');

        setLoading(true);
        try {
            await authApi.resetPassword(token, password);
            setDone(true);
            setTimeout(() => navigate('/acceso'), 2500);
        } catch (err) {
            setError(err.message || 'El enlace es inválido o expiró.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <video className="login-video-bg" autoPlay muted loop playsInline poster={loginPoster}>
                <source src={loginVideo} type="video/mp4" />
            </video>
            <div className="login-overlay" />

            <div className="login-card">
                <div className="login-logo">🐾</div>
                <h2>Nueva contraseña</h2>

                {!token && <div className="error-message">Enlace inválido: falta el token.</div>}

                {done ? (
                    <p className="login-subtitle">¡Contraseña actualizada! Redirigiendo al inicio de sesión...</p>
                ) : token && (
                    <form onSubmit={handleSubmit}>
                        {error && <div className="error-message">{error}</div>}
                        <div className="input-group">
                            <label>Nueva contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Confirmar contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Guardando...' : 'Restablecer contraseña'}
                        </button>
                    </form>
                )}

                <div className="login-footer">
                    <p><Link to="/acceso">← Volver a iniciar sesión</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
