// src/components/Login/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';
import loginVideo from '../../assets/login.mp4';
import loginPoster from '../../assets/1.jpg';
import { authApi } from '../../api/apiClient';

const ForgotPassword = () => {
    const [email,   setEmail]   = useState('');
    const [loading, setLoading] = useState(false);
    const [sent,    setSent]    = useState(false);
    const [error,   setError]   = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            // Respuesta genérica siempre — no revelamos si el email existe o no.
            setSent(true);
        } catch (err) {
            setError('No se pudo procesar la solicitud. Intenta de nuevo.');
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
                <h2>Recuperar contraseña</h2>
                <p className="login-subtitle">
                    {sent
                        ? 'Si el correo está registrado, te enviamos un enlace para restablecerla.'
                        : 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.'}
                </p>

                {!sent && (
                    <form onSubmit={handleSubmit}>
                        {error && <div className="error-message">{error}</div>}
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
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar enlace'}
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

export default ForgotPassword;
