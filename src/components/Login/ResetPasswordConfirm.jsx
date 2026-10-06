// src/components/Login/ResetPasswordConfirm.jsx
//
// Destino del enlace que manda AEGIS en el correo de "Olvidé mi contraseña":
// lee el token de un solo uso de la URL (?token=…) y fija la contraseña
// nueva. Vive en /:giro/:slug/restablecer y también en /restablecer-contrasena
// (sin negocio en la URL) por si el enlace del correo no trae el negocio.
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Login.css';
import loginVideo from '../../assets/login.mp4';
import loginPoster from '../../assets/1.jpg';
import { authApi } from '../../api/apiClient';
import { useBusinessPath } from '../../utils/businessPath';

const readToken = (location) => {
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    return q.get('token') || q.get('t') || h.get('token') || '';
};

const ResetPasswordConfirm = () => {
    const location = useLocation();
    const { withBusinessPath } = useBusinessPath();
    const accesoPath = withBusinessPath('/acceso');
    const [token] = useState(() => readToken(location));
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 12) return setError('La contraseña debe tener al menos 12 caracteres.');
        if (password !== confirm) return setError('Las contraseñas no coinciden.');
        setLoading(true);
        try {
            await authApi.passwordResetConfirm(token, password);
            setDone(true);
        } catch (err) {
            setError(err.message || 'No se pudo restablecer la contraseña.');
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
                <div className="login-logo">🔑</div>
                <h2>Nueva contraseña</h2>
                {!token ? (
                    <>
                        <p className="login-subtitle">Este enlace no es válido o está incompleto. Pide uno nuevo desde "¿Olvidaste tu contraseña?".</p>
                        <Link to={withBusinessPath('/olvide-contrasena')} className="login-button" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Pedir otro enlace</Link>
                    </>
                ) : done ? (
                    <>
                        <p className="login-subtitle">Listo, tu contraseña quedó cambiada. Ya puedes iniciar sesión con ella.</p>
                        <Link to={accesoPath} className="login-button" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Iniciar sesión</Link>
                    </>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="login-subtitle">Elige una contraseña de al menos 12 caracteres.</p>
                        {error && <div className="error-message" role="alert">{error}</div>}
                        <div className="input-group">
                            <label htmlFor="rp-new">Nueva contraseña</label>
                            <input id="rp-new" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="rp-confirm">Confirmar contraseña</label>
                            <input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                        </div>
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Guardando…' : 'Guardar contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordConfirm;
