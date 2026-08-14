// src/pages/superadmin/SuperAdminPanel.jsx
//
// Lista todas las empresas registradas en Perrucho. "Entrar" no abre un
// panel cruzado nuevo — pide al backend el token del propio administrador
// de esa empresa (POST /api/superadmin/businesses/:slug/enter) y reutiliza
// el dashboard de administrador de siempre, así no hay que duplicar toda la
// UI de agenda/POS/inventario/clientes para verla "desde arriba".
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiSignOutBold, PiArrowSquareInBold } from 'react-icons/pi';
import { superAdminApi } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import './SuperAdmin.css';

const SuperAdminPanel = () => {
    const { user, logout, establishSession } = useAuth();
    const navigate = useNavigate();
    const [businesses, setBusinesses] = useState(null);
    const [error, setError] = useState('');
    const [enteringSlug, setEnteringSlug] = useState(null);

    useEffect(() => {
        superAdminApi.businesses()
            .then(setBusinesses)
            .catch(() => setError('No se pudo cargar la lista de negocios.'));
    }, []);

    const handleEnter = async (slug) => {
        setEnteringSlug(slug);
        setError('');
        try {
            const { token, user: adminUser } = await superAdminApi.enter(slug);
            establishSession(token, adminUser);
            navigate('/admin-dashboard');
        } catch (err) {
            setError(err.message || 'No se pudo entrar a ese negocio.');
            setEnteringSlug(null);
        }
    };

    return (
        <div className="sa-page sa-page--panel">
            <header className="sa-header">
                <div>
                    <span className="sa-logo">Perrucho · Panel maestro</span>
                    <span className="sa-header-user">{user?.name}</span>
                </div>
                <button type="button" className="sa-logout" onClick={() => { logout(); navigate('/superadmin'); }}>
                    <PiSignOutBold /> Salir
                </button>
            </header>

            <main className="sa-panel-body">
                <h1>Negocios registrados</h1>
                {error && <div className="sa-error">{error}</div>}

                {businesses === null && !error && <p className="sa-hint">Cargando...</p>}

                {businesses && (
                    <div className="sa-table-wrap">
                        <table className="sa-table">
                            <thead>
                                <tr>
                                    <th>Negocio</th>
                                    <th>Giro</th>
                                    <th>Auth</th>
                                    <th>Usuarios</th>
                                    <th>Estado</th>
                                    <th>Alta</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {businesses.map((b) => (
                                    <tr key={b.id}>
                                        <td>
                                            <div className="sa-business-name">{b.name}</div>
                                            <div className="sa-business-slug">/{b.slug}</div>
                                        </td>
                                        <td>{b.giro}</td>
                                        <td>{b.authProvider}</td>
                                        <td>{b.userCount}</td>
                                        <td>
                                            <span className={`sa-badge ${b.isActive ? 'sa-badge--ok' : 'sa-badge--off'}`}>
                                                {b.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td>{new Date(b.createdAt).toLocaleDateString('es-MX')}</td>
                                        <td>
                                            <button
                                                type="button" className="sa-enter-btn"
                                                disabled={enteringSlug === b.slug}
                                                onClick={() => handleEnter(b.slug)}
                                            >
                                                <PiArrowSquareInBold /> {enteringSlug === b.slug ? 'Entrando...' : 'Entrar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {businesses.length === 0 && <p className="sa-hint">Todavía no hay negocios registrados.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SuperAdminPanel;
