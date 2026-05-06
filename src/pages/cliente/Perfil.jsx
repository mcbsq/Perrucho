// src/pages/cliente/Perfil.jsx
//
// CAMBIOS v3:
// 1. window.confirm() reemplazado por NotifyDialog custom (pop-up con estilo
//    coherente, sin diálogo nativo del navegador).
// 2. Notificaciones del Perfil: badge de count animado, campana con shake.
//
// Mantiene de v2: validación WhatsApp en form, raza editable, peso aproximado,
// botón cancelar cita con regla MIN_CANCEL_HOURS, redirección a WhatsApp del
// negocio cuando la cita está dentro de 24h.

import React, { useState, useEffect, useCallback } from 'react';
import {
    FaPaw, FaCalendarCheck, FaShoppingBag, FaSignOutAlt,
    FaTimes, FaEdit, FaPlus, FaSave,
    FaBell, FaHistory, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt,
    FaWhatsapp, FaInfoCircle, FaBan
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsApi, petsApi, salesApi, clientsApi } from '../../api/apiClient';
import { useNotify } from '../../components/shared/NotifyDialog';
import '../../components/shared/NotifyDialog.css';
import { STATUS_COLORS, STATUS_EMOJI } from '../../utils/apptStatus';
import { formatMexPhone, whatsAppValidationError, isValidWhatsApp } from '../../utils/formatPhone';
import { canClientCancel, MIN_CANCEL_HOURS } from '../../utils/bookingRules';
import { clientToShopOnCancelRequest, clientToShopOnCancelDone, openWhatsApp } from '../../utils/whatsappNotify';
import './Perfil.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const speciesEmoji = (sp) => {
    if (!sp) return '🐾';
    const s = sp.toLowerCase();
    if (s.includes('perro')) return '🐕';
    if (s.includes('gato'))  return '🐈';
    if (s.includes('ave'))   return '🦜';
    return '🐾';
};

const hueFromId = (id) => {
    const n = typeof id === 'string'
        ? id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
        : Number(id);
    return (n * 137) % 360;
};

const formatDate = (str) => {
    if (!str) return '—';
    try {
        return new Date(str + 'T12:00:00').toLocaleDateString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    } catch { return str; }
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`perfil-toast perfil-toast--${type}`}>
            <span>{message}</span>
            <button onClick={onClose}><FaTimes /></button>
        </div>
    );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);
    return (
        <div className="perfil-modal-overlay" onClick={onClose}>
            <div className="perfil-modal" onClick={e => e.stopPropagation()}>
                <div className="perfil-modal-header">
                    <h3>{title}</h3>
                    <button className="perfil-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="perfil-modal-body">{children}</div>
            </div>
        </div>
    );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const Perfil = () => {
    const { user, logout, updateSessionUser } = useAuth();
    const { notify, NotifyNode } = useNotify();

    const [myPets,    setMyPets]    = useState([]);
    const [myAppts,   setMyAppts]   = useState([]);
    const [mySales,   setMySales]   = useState([]);
    const [myClient,  setMyClient]  = useState(null);
    const [loading,   setLoading]   = useState(true);

    const [toast,        setToast]        = useState(null);
    const [petModal,     setPetModal]     = useState(null);
    const [profileModal, setProfileModal] = useState(false);
    const [cancelModal,  setCancelModal]  = useState(null); // appt a cancelar
    const [activeTab,    setActiveTab]    = useState('citas');

    const [profilePhoneError, setProfilePhoneError] = useState('');

    const addToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
    }, []);

    // ── Obtener clientId definitivo ───────────────────────────────────────────
    const resolveClientId = useCallback(async () => {
        if (user?.clientId) return user.clientId;

        try {
            const allClients = await clientsApi.getAll();
            const match = allClients.find(c =>
                c.email?.toLowerCase() === user?.email?.toLowerCase()
            );
            if (match) {
                if (updateSessionUser) updateSessionUser({ clientId: match.id });
                return match.id;
            }
        } catch (err) {
            console.error('Error buscando clientId:', err);
        }
        return null;
    }, [user, updateSessionUser]);

    // ── Carga de datos ────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const clientId = await resolveClientId();

            if (clientId) {
                const allClients = await clientsApi.getAll();
                const client = allClients.find(c => String(c.id) === String(clientId));
                setMyClient(client || null);

                const appts = await appointmentsApi.getByClient(clientId);
                setMyAppts(appts.sort((a, b) => {
                    if (a.date > b.date) return -1;
                    if (a.date < b.date) return 1;
                    return (a.time || '').localeCompare(b.time || '');
                }));

                const pets = await petsApi.getByOwner(clientId);
                setMyPets(pets);

                const allSales = await salesApi.getAll();
                setMySales(
                    allSales
                        .filter(s => String(s.clientId) === String(clientId))
                        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                );
            }
        } catch (err) {
            addToast('Error al cargar tu información', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, resolveClientId, addToast]);

    useEffect(() => { loadData(); }, [loadData]);

    // Polling de citas — solo recarga citas cada 30s sin tocar mascotas ni ventas
    const refreshAppts = useCallback(async () => {
        if (!user?.id) return;
        try {
            const clientId = await resolveClientId();
            if (!clientId) return;
            const appts = await appointmentsApi.getByClient(clientId);
            setMyAppts(appts.sort((a, b) => {
                if (a.date > b.date) return -1;
                if (a.date < b.date) return 1;
                return (a.time || '').localeCompare(b.time || '');
            }));
        } catch { /* silencioso */ }
    }, [user, resolveClientId]);

    useEffect(() => {
        const interval = setInterval(refreshAppts, 30000);
        return () => clearInterval(interval);
    }, [refreshAppts]);

    // ── Guardar perfil ────────────────────────────────────────────────────────
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const phone = fd.get('phone');

        if (phone && !isValidWhatsApp(phone)) {
            setProfilePhoneError(whatsAppValidationError(phone));
            return;
        }

        const updated = {
            name:    fd.get('name'),
            email:   fd.get('email'),
            phone:   phone,
            address: fd.get('address'),
        };
        try {
            if (myClient?.id) {
                await clientsApi.update(myClient.id, { ...myClient, ...updated });
                setMyClient(prev => ({ ...prev, ...updated }));
                if (updateSessionUser) updateSessionUser({ name: updated.name, email: updated.email });
            }
            addToast('Perfil actualizado', 'success');
            setProfileModal(false);
            setProfilePhoneError('');
        } catch {
            addToast('Error al actualizar', 'error');
        }
    };

    const handleProfilePhoneInput = (e) => {
        e.target.value = formatMexPhone(e.target.value);
        if (e.target.value.length > 0) {
            setProfilePhoneError(whatsAppValidationError(e.target.value));
        } else {
            setProfilePhoneError('');
        }
    };

    // ── Guardar mascota ───────────────────────────────────────────────────────
    const handleSavePet = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const clientId = await resolveClientId();

        const form = {
            petName:  fd.get('petName'),
            species:  fd.get('species'),
            breed:    fd.get('breed'),
            weight:   fd.get('weight'),
            notes:    fd.get('notes'),
            ownerId:  clientId,
            history:  petModal?.history || [],
        };

        try {
            if (petModal?.id) {
                const upd = await petsApi.update(petModal.id, { ...petModal, ...form });
                setMyPets(prev => prev.map(p => p.id === petModal.id ? upd : p));
                addToast('Mascota actualizada', 'success');
            } else {
                const created = await petsApi.create(form);
                setMyPets(prev => [...prev, created]);
                addToast('Mascota registrada', 'success');
            }
            setPetModal(null);
        } catch {
            addToast('Error al guardar', 'error');
        }
    };

    // ── Cancelar cita ─────────────────────────────────────────────────────────
    // Si está dentro de la ventana → redirige a WhatsApp del negocio.
    // Si está fuera → cancela en sistema y pregunta con pop-up custom si quiere
    // avisar al negocio por WhatsApp.
    const handleConfirmCancel = async () => {
        if (!cancelModal) return;
        const appt = cancelModal;
        const check = canClientCancel(appt);

        const clientName  = myClient?.name || user?.name || 'Cliente';
        const baseInfo = {
            clientName,
            petName:     appt.petName     || 'Mascota',
            serviceName: appt.serviceName || 'Servicio',
            date:        appt.date,
            time:        appt.time,
        };

        if (!check.ok) {
            const url = clientToShopOnCancelRequest(baseInfo);
            openWhatsApp(url);
            addToast('Te redirigimos a WhatsApp para coordinar la cancelación.', 'info');
            setCancelModal(null);
            return;
        }

        // Fuera de la ventana → cancelar en el sistema
        try {
            await appointmentsApi.update(appt.id, { status: 'Cancelada' });
            setMyAppts(prev => prev.map(a =>
                a.id === appt.id ? { ...a, status: 'Cancelada' } : a
            ));
            addToast('Cita cancelada', 'success');
            setCancelModal(null);

            // Pop-up custom para preguntar si quiere avisar al negocio
            setTimeout(async () => {
                const wantsToNotify = await notify({
                    type: 'confirm',
                    icon: '💬',
                    accent: 'mint',
                    title: '¿Avisar al negocio?',
                    message: 'Se abrirá WhatsApp con un mensaje pre-llenado para informar a la estética sobre tu cancelación.',
                    confirmLabel: 'Sí, avisar',
                    cancelLabel:  'No, gracias',
                });
                if (wantsToNotify) {
                    const url = clientToShopOnCancelDone(baseInfo);
                    if (url) openWhatsApp(url);
                }
            }, 200);
        } catch {
            addToast('Error al cancelar la cita', 'error');
            setCancelModal(null);
        }
    };

    // ── Datos de display ──────────────────────────────────────────────────────
    const today       = new Date().toISOString().split('T')[0];
    const displayName = myClient?.name  || user?.name  || 'Usuario';
    const displayEmail= myClient?.email || user?.email || '';

    const nextAppt = myAppts.find(a =>
        a.date >= today && a.status !== 'Cancelada' && a.status !== 'Finalizada'
    );
    const pendingAppts = myAppts.filter(a =>
        a.status === 'Pendiente' || a.status === 'Confirmada'
    );

    const isCancellable = (appt) => {
        return appt.status !== 'Cancelada' &&
               appt.status !== 'Finalizada' &&
               appt.status !== 'En proceso';
    };

    if (loading) return (
        <div className="perfil-loading">
            <div className="perfil-spinner" />
            <p>Cargando tu perfil...</p>
        </div>
    );

    return (
        <div className="perfil-container fade-in">
            {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {NotifyNode}

            <div className="perfil-grid">

                {/* ── SIDEBAR ── */}
                <aside className="perfil-sidebar">
                    {/* Perfil */}
                    <div className="profile-card user-info">
                        <div className="avatar-large" style={{ background: `hsl(${hueFromId(user?.id || 1)},60%,58%)` }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <h2>{displayName}</h2>
                        <p className="user-email">{displayEmail}</p>
                        <span className="badge-role">🐾 Cliente</span>
                        <div className="user-details-mini">
                            {myClient?.phone   && <p><FaPhone />        {myClient.phone}</p>}
                            {myClient?.address && <p><FaMapMarkerAlt /> {myClient.address}</p>}
                        </div>
                        <hr />
                        <button className="btn-edit-profile" onClick={() => setProfileModal(true)}>
                            <FaEdit /> Editar datos
                        </button>
                        <button className="btn-logout-alt" onClick={logout}>
                            <FaSignOutAlt /> Cerrar sesión
                        </button>
                    </div>

                    {/* Próxima cita */}
                    <div className="profile-card next-service">
                        <h3><FaCalendarCheck /> Próxima cita</h3>
                        {nextAppt ? (
                            <div className="next-appointment-box">
                                <p className="appt-service">{nextAppt.serviceName || 'Servicio'}</p>
                                <p>📅 {formatDate(nextAppt.date)}</p>
                                {nextAppt.time && <p>🕐 {nextAppt.time}</p>}
                                <p>🐾 {nextAppt.petName || '—'}</p>
                                <div className="appt-status-pill" style={{
                                    background: STATUS_COLORS[nextAppt.status]?.bg,
                                    color:      STATUS_COLORS[nextAppt.status]?.text,
                                    border:     `1px solid ${STATUS_COLORS[nextAppt.status]?.border}`,
                                }}>
                                    <span className="status-dot" style={{ background: STATUS_COLORS[nextAppt.status]?.dot }} />
                                    {STATUS_EMOJI[nextAppt.status]} {nextAppt.status}
                                </div>
                            </div>
                        ) : (
                            <div className="next-appointment-box next-appointment-box--empty">
                                <p>😊 Sin citas próximas</p>
                            </div>
                        )}
                    </div>

                    {/* Notificaciones */}
                    {pendingAppts.length > 0 && (
                        <div className="profile-card notif-card">
                            <h3>
                                <FaBell /> Notificaciones
                                <span className="notif-count-badge">{pendingAppts.length}</span>
                            </h3>
                            {pendingAppts.slice(0, 4).map(a => (
                                <div key={a.id} className="notif-item">
                                    <div className="notif-dot" style={{ background: STATUS_COLORS[a.status]?.dot }} />
                                    <div>
                                        <strong>{a.petName}</strong> — {a.serviceName}
                                        <span className="notif-date">
                                            {formatDate(a.date)} · {STATUS_EMOJI[a.status]} {a.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>

                {/* ── MAIN ── */}
                <main className="perfil-main-content">

                    {/* Mascotas */}
                    <section className="profile-section">
                        <div className="section-header">
                            <h3><FaPaw /> Mis mascotas</h3>
                            <button className="btn-add" onClick={() => setPetModal({})}>
                                <FaPlus /> Agregar
                            </button>
                        </div>
                        {myPets.length === 0 ? (
                            <div className="empty-state">
                                <span>🐾</span>
                                <p>Aún no tienes mascotas registradas</p>
                                <button className="btn-add-empty" onClick={() => setPetModal({})}>
                                    Registrar mi primera mascota
                                </button>
                            </div>
                        ) : (
                            <div className="mascotas-grid">
                                {myPets.map(pet => {
                                    const h = hueFromId(pet.id);
                                    return (
                                        <div key={pet.id} className="pet-card" onClick={() => setPetModal(pet)}>
                                            <div className="pet-avatar-wrap">
                                                <div className="pet-avatar-circle" style={{ background: `hsl(${h},65%,60%)` }}>
                                                    {pet.petName?.[0]?.toUpperCase()}
                                                </div>
                                                <span className="pet-species-badge">{speciesEmoji(pet.species)}</span>
                                            </div>
                                            <h4>{pet.petName}</h4>
                                            <p>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                                            {pet.weight && <span className="pet-weight">~{pet.weight} kg</span>}
                                            {pet.notes  && <p className="pet-notes-mini">📌 {pet.notes}</p>}
                                            <span className="pet-edit-hint">Toca para editar</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Tabs */}
                    <section className="profile-section history-section">
                        <div className="tabs-header">
                            {[
                                { id: 'citas',     icon: <FaCalendarCheck />, label: 'Mis citas'        },
                                { id: 'compras',   icon: <FaShoppingBag />,   label: 'Compras'          },
                                { id: 'historial', icon: <FaHistory />,        label: 'Historial clínico'},
                            ].map(t => (
                                <button key={t.id}
                                    className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(t.id)}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Citas */}
                        {activeTab === 'citas' && (
                            <div className="tab-content">
                                {myAppts.length === 0 ? (
                                    <p className="empty-tab">Sin citas registradas</p>
                                ) : (
                                    <div className="appts-list">
                                        {myAppts.map(a => {
                                            const sc = STATUS_COLORS[a.status] || STATUS_COLORS['Pendiente'];
                                            const cancellable = isCancellable(a);
                                            return (
                                                <div key={a.id} className="appt-row" style={{ borderLeft: `4px solid ${sc.border}` }}>
                                                    <div className="appt-row-main">
                                                        <div className="appt-row-info">
                                                            <strong>{a.petName}</strong>
                                                            <span>{a.serviceName}</span>
                                                            <span className="appt-datetime">
                                                                📅 {formatDate(a.date)}{a.time ? ` · 🕐 ${a.time}` : ''}
                                                            </span>
                                                        </div>
                                                        <div className="appt-row-right">
                                                            <span className="appt-status-badge" style={{
                                                                background: sc.bg,
                                                                color:      sc.text,
                                                                border:     `1px solid ${sc.border}`,
                                                            }}>
                                                                <span className="status-dot" style={{ background: sc.dot }} />
                                                                {STATUS_EMOJI[a.status]} {a.status}
                                                            </span>
                                                            {a.finalPrice && (
                                                                <span className="appt-price">~${a.finalPrice}</span>
                                                            )}
                                                            {cancellable && (
                                                                <button
                                                                    className="appt-cancel-btn"
                                                                    onClick={() => setCancelModal(a)}
                                                                    title="Cancelar cita"
                                                                >
                                                                    <FaBan /> Cancelar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Compras */}
                        {activeTab === 'compras' && (
                            <div className="tab-content">
                                {mySales.length === 0 ? (
                                    <p className="empty-tab">Sin compras registradas</p>
                                ) : (
                                    <div className="sales-list">
                                        {mySales.map(s => (
                                            <div key={s.id} className="sale-row">
                                                <div className="sale-icon">{s.type === 'product' ? '📦' : '✂️'}</div>
                                                <div className="sale-info">
                                                    <strong>{typeof s.item === 'object' ? 'Compra múltiple' : s.item}</strong>
                                                    <span className="sale-date">{formatDate(s.date)}</span>
                                                </div>
                                                <span className="sale-amount">${Number(s.price).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="sales-total">
                                            <span>Total gastado</span>
                                            <strong>${mySales.reduce((a, s) => a + Number(s.price), 0).toLocaleString()}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Historial clínico */}
                        {activeTab === 'historial' && (
                            <div className="tab-content">
                                {myPets.length === 0 ? (
                                    <p className="empty-tab">Registra una mascota para ver su historial</p>
                                ) : myPets.map(pet => {
                                    const h       = hueFromId(pet.id);
                                    const history = pet.history || [];
                                    return (
                                        <div key={pet.id} className="vet-history-block">
                                            <div className="vet-history-header">
                                                <div className="vet-history-avatar" style={{ background: `hsl(${h},65%,60%)` }}>
                                                    {pet.petName?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong>{pet.petName}</strong>
                                                    <span>{speciesEmoji(pet.species)} {pet.breed || '—'} · ~{pet.weight} kg</span>
                                                    {pet.notes && <span className="vet-notes">📌 {pet.notes}</span>}
                                                </div>
                                            </div>
                                            {history.length === 0 ? (
                                                <p className="empty-history">Sin visitas registradas aún</p>
                                            ) : (
                                                <div className="vet-timeline">
                                                    {[...history].reverse().map((entry, i) => (
                                                        <div key={i} className="vet-entry">
                                                            <div className="vet-entry-dot" />
                                                            <div className="vet-entry-content">
                                                                <span className="vet-entry-date">{entry.date}</span>
                                                                {entry.author && (
                                                                    <span className="vet-entry-author">por {entry.author}</span>
                                                                )}
                                                                <p>{entry.detail}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>
            </div>

            {/* Modal editar perfil */}
            {profileModal && (
                <Modal title="✏️ Editar mis datos" onClose={() => { setProfileModal(false); setProfilePhoneError(''); }}>
                    <form onSubmit={handleSaveProfile} className="perfil-form">
                        <div className="form-field">
                            <label><FaUser /> Nombre completo</label>
                            <input name="name" defaultValue={myClient?.name || user?.name} placeholder="Tu nombre" required />
                        </div>
                        <div className="form-field">
                            <label><FaEnvelope /> Correo electrónico</label>
                            <input name="email" type="email" defaultValue={myClient?.email || user?.email} placeholder="correo@ejemplo.com" required />
                        </div>
                        <div className="form-field">
                            <label><FaWhatsapp /> WhatsApp (10 dígitos)</label>
                            <input
                                name="phone"
                                defaultValue={myClient?.phone}
                                placeholder="228 304 5591"
                                onChange={handleProfilePhoneInput}
                                inputMode="numeric"
                            />
                            {profilePhoneError && (
                                <small className="form-hint form-hint--error">{profilePhoneError}</small>
                            )}
                        </div>
                        <div className="form-field">
                            <label><FaMapMarkerAlt /> Dirección</label>
                            <input name="address" defaultValue={myClient?.address} placeholder="Calle y número" />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => { setProfileModal(false); setProfilePhoneError(''); }}>Cancelar</button>
                            <button type="submit" className="btn-save"><FaSave /> Guardar</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal mascota */}
            {petModal !== null && (
                <Modal
                    title={petModal?.id ? `✏️ Editar — ${petModal.petName}` : '🐾 Nueva mascota'}
                    onClose={() => setPetModal(null)}>
                    <form onSubmit={handleSavePet} className="perfil-form">
                        <div className="form-field">
                            <label>Nombre</label>
                            <input name="petName" defaultValue={petModal?.petName} placeholder="Nombre de tu mascota" required />
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label>Especie</label>
                                <select name="species" defaultValue={petModal?.species || 'perro'}>
                                    <option value="perro">🐕 Perro</option>
                                    <option value="gato">🐈 Gato</option>
                                    <option value="ave">🦜 Ave</option>
                                    <option value="otro">🐾 Otro</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Peso aproximado (kg)</label>
                                <input name="weight" type="number" step="0.1" defaultValue={petModal?.weight} placeholder="Ej: 5" />
                            </div>
                        </div>
                        <small className="form-hint form-hint--info">
                            <FaInfoCircle /> El peso final se verifica con báscula en sucursal.
                        </small>
                        <div className="form-field">
                            <label>Raza</label>
                            <input
                                name="breed"
                                type="text"
                                defaultValue={petModal?.breed}
                                placeholder="Ej: Poodle, Mestizo, Pastor Australiano..."
                            />
                            <small className="form-hint">
                                Escríbela libremente. Si no estás seguro/a, puedes dejarla vacía o poner "mestizo".
                            </small>
                        </div>
                        <div className="form-field">
                            <label>Notas / alergias</label>
                            <input name="notes" defaultValue={petModal?.notes} placeholder="Condiciones especiales..." />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => setPetModal(null)}>Cancelar</button>
                            <button type="submit" className="btn-save">
                                <FaSave /> {petModal?.id ? 'Actualizar' : 'Registrar'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal cancelar cita */}
            {cancelModal && (() => {
                const check = canClientCancel(cancelModal);
                const dentroVentana = !check.ok;
                return (
                    <Modal title="⚠️ Cancelar cita" onClose={() => setCancelModal(null)}>
                        <div className="cancel-modal-body">
                            <div className="cancel-appt-info">
                                <p><strong>{cancelModal.petName}</strong> — {cancelModal.serviceName}</p>
                                <p>📅 {formatDate(cancelModal.date)} {cancelModal.time && `· 🕐 ${cancelModal.time}`}</p>
                            </div>

                            {dentroVentana ? (
                                <>
                                    <div className="cancel-warning cancel-warning--blocked">
                                        <FaInfoCircle />
                                        <p>{check.reason}</p>
                                    </div>
                                    <p className="cancel-cta-text">
                                        Para cancelar o reagendar esta cita, contacta directamente
                                        a la estética por WhatsApp:
                                    </p>
                                    <div className="cancel-modal-actions">
                                        <button type="button" className="btn-cancel" onClick={() => setCancelModal(null)}>
                                            Volver
                                        </button>
                                        <button type="button" className="btn-whatsapp-cancel" onClick={handleConfirmCancel}>
                                            <FaWhatsapp /> Contactar por WhatsApp
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="cancel-warning">
                                        <FaInfoCircle />
                                        <p>
                                            Tienes <strong>{check.hoursLeft} hora(s)</strong> antes de tu cita.
                                            Puedes cancelarla ahora ({MIN_CANCEL_HOURS}h+ de anticipación).
                                        </p>
                                    </div>
                                    <p className="cancel-cta-text">
                                        ¿Estás seguro/a de cancelar esta cita? Esta acción no se puede deshacer.
                                    </p>
                                    <div className="cancel-modal-actions">
                                        <button type="button" className="btn-cancel" onClick={() => setCancelModal(null)}>
                                            No, mantener
                                        </button>
                                        <button type="button" className="btn-confirm-cancel" onClick={handleConfirmCancel}>
                                            <FaBan /> Sí, cancelar cita
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </Modal>
                );
            })()}
        </div>
    );
};

export default Perfil;