// src/pages/superadmin/SuperAdminLogin.jsx
//
// Login de la cuenta maestra de la plataforma — separado a propósito del
// login normal de negocio (/:slug/acceso): esa ruta siempre resuelve contra
// un businessId, y la cuenta maestra no pertenece a ninguno (ver
// POST /api/superadmin/login).
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import './SuperAdmin.css';

const SuperAdminLogin = () => {
    const { establishSession } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token, user } = await superAdminApi.login(email, password);
            establishSession(token, user);
            navigate('/superadmin/panel');
        } catch (err) {
            setError(err.status === 401 ? 'Correo o contraseña incorrectos.' : 'No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sa-page">
            <div className="sa-login-card">
                <Link to="/" className="sa-back">← Emporio</Link>
                <h2>Panel maestro</h2>
                <p className="sa-login-sub">Acceso restringido a la cuenta de plataforma.</p>
                <form onSubmit={handleSubmit}>
                    {error && <div className="sa-error">{error}</div>}
                    <div className="sa-field">
                        <label>Correo</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                    </div>
                    <div className="sa-field">
                        <label>Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="sa-submit" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminLogin;
