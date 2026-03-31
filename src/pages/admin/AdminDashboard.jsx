// src/pages/admin/AdminDashboard.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsApi, usersApi } from '../../api/apiClient';
import * as XLSX from 'xlsx';
import {
    FaCut, FaPaw, FaPlusCircle, FaSignOutAlt, FaUserShield,
    FaUsers, FaEdit, FaTrash, FaFileExcel, FaCalendarAlt,
    FaClock, FaCashRegister, FaSearch, FaBoxOpen, FaCartPlus,
    FaReceipt, FaTrashAlt, FaTachometerAlt, FaUserCog, FaTimes,
    FaChartBar, FaExclamationTriangle, FaDollarSign, FaSync,
    FaNotesMedical, FaCheckCircle
} from 'react-icons/fa';
import './AdminDashboard.css';

// ─── Helpers de fecha ────────────────────────────────────────────────────────
const parseDate = (str) => {
    if (!str) return null;
    const parts = String(str).split(/[\/\-T]/);
    if (parts[0].length === 4) return new Date(str);
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
};

const isSameMonth = (dateStr, year, month) => {
    const d = parseDate(dateStr);
    if (!d || isNaN(d)) return false;
    return d.getFullYear() === year && d.getMonth() === month;
};

const isSameDay = (dateStr, dateObj) => {
    const d = parseDate(dateStr);
    if (!d || isNaN(d)) return false;
    return d.getFullYear() === dateObj.getFullYear() &&
           d.getMonth()    === dateObj.getMonth()    &&
           d.getDate()     === dateObj.getDate();
};

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Toast de feedback ───────────────────────────────────────────────────────
// FIX WARN#5: feedback visual para errores y confirmaciones en lugar de silenciar
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`toast toast--${type}`}>
            <span>{message}</span>
            <button onClick={onClose}><FaTimes /></button>
        </div>
    );
};

const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    return { toasts, addToast, removeToast };
};

// ─── Diálogo de confirmación ─────────────────────────────────────────────────
// FIX BUG#3: eliminaciones con confirmación visual en lugar de window.confirm
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
    <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-box confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3><FaExclamationTriangle style={{color:'#ff7675',marginRight:8}}/>Confirmar acción</h3>
                <button className="modal-close" onClick={onCancel}><FaTimes /></button>
            </div>
            <div className="modal-body">
                <p className="confirm-message">{message}</p>
                <div className="form-actions" style={{marginTop:16}}>
                    <button className="btn-danger" onClick={onConfirm}>Sí, eliminar</button>
                    <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
                </div>
            </div>
        </div>
    </div>
);

const useConfirm = () => {
    const [dialog, setDialog] = useState(null);
    const confirm = useCallback((message) => new Promise((resolve) => {
        setDialog({ message, resolve });
    }), []);
    const handleResponse = (result) => {
        dialog?.resolve(result);
        setDialog(null);
    };
    const ConfirmNode = dialog ? (
        <ConfirmDialog
            message={dialog.message}
            onConfirm={() => handleResponse(true)}
            onCancel={() => handleResponse(false)}
        />
    ) : null;
    return { confirm, ConfirmNode };
};

// ─── Gráfica de barras horizontal (servicios por categoría) ─────────────────
const ServiceChart = ({ sales, services }) => {
    const cats = useMemo(() => {
        const now = new Date();
        const map = {};
        sales.forEach(s => {
            if (!isSameMonth(s.date, now.getFullYear(), now.getMonth())) return;
            const svc = services.find(sv =>
                String(s.item).toLowerCase().includes(sv.title?.toLowerCase())
            );
            const cat = svc?.category || 'Otros';
            map[cat] = (map[cat] || 0) + Number(s.price);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [sales, services]);

    const max = Math.max(...cats.map(c => c[1]), 1);
    const COLORS = ['#74b9ff','#a29bfe','#55efc4','#fdcb6e','#ff7675'];

    return (
        <div className="service-chart">
            {cats.length === 0
                ? <p className="empty-chart">Sin datos este mes</p>
                : cats.map(([cat, total], i) => (
                    <div key={cat} className="svc-bar-row">
                        <span className="svc-bar-label">{cat}</span>
                        <div className="svc-bar-track">
                            <div
                                className="svc-bar-fill"
                                style={{ width: `${(total / max) * 100}%`, background: COLORS[i % COLORS.length] }}
                            />
                        </div>
                        <span className="svc-bar-val">${total.toLocaleString()}</span>
                    </div>
                ))
            }
        </div>
    );
};

// ─── Gráfica de barras semanal (ventas) ─────────────────────────────────────
const WeeklyChart = ({ sales }) => {
    const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const today = new Date().getDay();
    const totals = useMemo(() => {
        const map = [0,0,0,0,0,0,0];
        const now = new Date();
        sales.forEach(s => {
            const d = parseDate(s.date);
            if (!d || isNaN(d)) return;
            const diff = Math.floor((now - d) / 86400000);
            if (diff >= 0 && diff < 7) map[d.getDay()] += Number(s.price) || 0;
        });
        return map;
    }, [sales]);
    const max = Math.max(...totals, 1);

    return (
        <div className="weekly-chart-wrap">
            <div className="chart-bars">
                {totals.map((val, i) => (
                    <div key={i} className="chart-col">
                        <span className="chart-val">{val > 0 ? `$${val}` : ''}</span>
                        <div
                            className={`chart-bar ${i === today ? 'today' : ''}`}
                            style={{ height: `${Math.max((val / max) * 80, 4)}px` }}
                        />
                        <span className="chart-day">{DAYS[i]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Modal genérico ──────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div
            className={`modal-box ${wide ? 'modal-wide' : ''}`}
            onClick={e => e.stopPropagation()}
        >
            <div className="modal-header">
                <h3>{title}</h3>
                <button className="modal-close" onClick={onClose}><FaTimes /></button>
            </div>
            <div className="modal-body">{children}</div>
        </div>
    </div>
);

// ─── Modal: Ventas del mes ───────────────────────────────────────────────────
const SalesModal = ({ sales, onClose }) => {
    const now = new Date();
    const months = Array.from({ length: 4 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() };
    });
    const [sel, setSel] = useState(0);
    const { year, month } = months[sel];

    const filtered = sales.filter(s => isSameMonth(s.date, year, month));
    const total = filtered.reduce((a, s) => a + Number(s.price), 0);

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtered.map(s => ({
            Fecha: s.date, Item: s.item, Monto: s.price
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
        XLSX.writeFile(wb, `Ventas_${months[sel].label}.xlsx`);
    };

    return (
        <Modal title="Ventas del mes" onClose={onClose} wide>
            <div className="modal-filters">
                {months.map((m, i) => (
                    <button key={i} className={`pill-btn ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>
                        {m.label}
                    </button>
                ))}
                <button className="pill-btn export-btn" onClick={exportExcel}>
                    <FaFileExcel /> Exportar
                </button>
            </div>
            <div className="modal-summary-row">
                <span>Total {months[sel].label}</span>
                <span className="modal-total">${total.toLocaleString()}</span>
            </div>
            <table className="modal-table">
                <thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th></tr></thead>
                <tbody>
                    {filtered.length === 0
                        ? <tr><td colSpan="3" className="empty-td">Sin ventas este período</td></tr>
                        : filtered.slice().reverse().map(s => (
                            <tr key={s.id}>
                                <td>{s.date}</td>
                                <td>{typeof s.item === 'object' ? 'Venta múltiple' : s.item}</td>
                                <td className="td-amount">${Number(s.price).toLocaleString()}</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </Modal>
    );
};

// ─── Modal: Agenda de pacientes ───────────────────────────────────────────────
const PatientsModal = ({ appointments, pets, clients, services, onClose }) => {
    const now = new Date();
    const [selAppt, setSelAppt] = useState(null);

    const monthAppts = appointments.filter(a =>
        isSameMonth(a.date, now.getFullYear(), now.getMonth())
    );

    const petAppt = (petId) => monthAppts.filter(a => String(a.petId) === String(petId));

    return (
        <Modal title={`Agenda de pacientes — ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`} onClose={onClose} wide>
            {pets.length === 0
                ? <p className="empty-td">Sin pacientes registrados</p>
                : pets.map(pet => {
                    const owner  = clients.find(c => String(c.id) === String(pet.ownerId));
                    const appts  = petAppt(pet.id);
                    return (
                        <div key={pet.id} className="patient-row">
                            <div className="patient-row-header">
                                <div className="pet-avatar-sm">{pet.petName?.[0]?.toUpperCase()}</div>
                                <div>
                                    <strong>{pet.petName}</strong>
                                    <span className="muted-text"> · {owner?.name || 'Sin dueño'} · {pet.weight} kg</span>
                                </div>
                                <span className="appt-count">{appts.length} cita{appts.length !== 1 ? 's' : ''}</span>
                            </div>
                            {appts.length > 0 && (
                                <div className="appt-chips">
                                    {appts.map(a => (
                                        <div
                                            key={a.id}
                                            className={`appt-chip ${selAppt?.id === a.id ? 'selected' : ''}`}
                                            onClick={() => setSelAppt(selAppt?.id === a.id ? null : a)}
                                        >
                                            <FaClock /> {a.time || a.date} — {a.serviceName}
                                            <span className="chip-price">${a.finalPrice}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selAppt && String(selAppt.petId) === String(pet.id) && (
                                <div className="appt-detail fade-in">
                                    <h5>Detalle de la cita</h5>
                                    <div className="detail-row"><span>Servicio</span><strong>{selAppt.serviceName}</strong></div>
                                    <div className="detail-row"><span>Hora</span><strong>{selAppt.time}</strong></div>
                                    <div className="detail-row"><span>Estado</span><strong>{selAppt.status}</strong></div>
                                    <div className="detail-row"><span>Importe</span><strong className="td-amount">${selAppt.finalPrice}</strong></div>
                                    {pet.history?.length > 0 && (
                                        <>
                                            <h5 style={{marginTop:'12px'}}>Historial clínico</h5>
                                            {pet.history.slice(-3).map((h, i) => (
                                                <div key={i} className="history-entry">
                                                    <span className="history-date">{h.date}</span>
                                                    <span>{h.detail}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            }
        </Modal>
    );
};

// ─── Modal: Reporte de clientes ───────────────────────────────────────────────
const ClientsModal = ({ sales, clients, pets, onClose }) => {
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const dateObj = new Date(selectedDate + 'T12:00:00');

    const daySales = sales.filter(s => isSameDay(s.date, dateObj));
    const dayTotal = daySales.reduce((a, s) => a + Number(s.price), 0);

    const byClient = daySales.reduce((acc, s) => {
        const key = s.clientId || '__sin_cliente__';
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
    }, {});

    const exportDay = () => {
        const rows = daySales.map(s => {
            const c = clients.find(c => String(c.id) === String(s.clientId));
            return { Fecha: s.date, Cliente: c?.name || 'Sin cliente', Item: s.item, Monto: s.price };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        XLSX.writeFile(wb, `Clientes_${selectedDate}.xlsx`);
    };

    return (
        <Modal title="Reporte de clientes por día" onClose={onClose} wide>
            <div className="modal-filters">
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="date-input"
                />
                <button className="pill-btn export-btn" onClick={exportDay}>
                    <FaFileExcel /> Exportar día
                </button>
            </div>
            <div className="modal-summary-row">
                <span>Total del día</span>
                <span className="modal-total">${dayTotal.toLocaleString()}</span>
            </div>
            {Object.keys(byClient).length === 0
                ? <p className="empty-td">Sin ventas este día</p>
                : Object.entries(byClient).map(([clientId, clientSales]) => {
                    const client   = clients.find(c => String(c.id) === String(clientId));
                    const subtotal = clientSales.reduce((a, s) => a + Number(s.price), 0);
                    return (
                        <div key={clientId} className="client-report-block">
                            <div className="client-report-header">
                                <div className="pet-avatar-sm" style={{background:'#eef2ff',color:'#3730a3'}}>
                                    {client?.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <strong>{client?.name || 'Sin cliente asignado'}</strong>
                                <span className="td-amount">${subtotal.toLocaleString()}</span>
                            </div>
                            <div className="client-report-items">
                                {clientSales.map(s => (
                                    <div key={s.id} className="client-report-item">
                                        <span>{typeof s.item === 'object' ? 'Venta múltiple' : s.item}</span>
                                        <span className="muted-text">${Number(s.price).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            }
        </Modal>
    );
};

// ─── Modal: Stock crítico ─────────────────────────────────────────────────────
const StockModal = ({ products, onClose }) => {
    const critical = products
        .filter(p => Number(p.stock) < 5)
        .sort((a, b) => Number(a.stock) - Number(b.stock));

    return (
        <Modal title="Productos con stock crítico" onClose={onClose}>
            {critical.length === 0
                ? <p className="empty-td">Todos los productos tienen stock suficiente</p>
                : critical.map(p => (
                    <div key={p.id} className="stock-critical-row">
                        <div>
                            <strong>{p.name}</strong>
                            <span className="muted-text"> · {p.category}</span>
                        </div>
                        <div className="stock-badge-wrap">
                            <span className={`stock-badge ${p.stock <= 1 ? 'danger' : 'warning'}`}>
                                {p.stock} unid.
                            </span>
                            <span className="muted-text">${p.price}</span>
                        </div>
                    </div>
                ))
            }
        </Modal>
    );
};

// ─── Estados iniciales de formularios ────────────────────────────────────────
const INITIAL_SERVICE = { title:'', price:'', duration:'', category:'Estética', description:'' };
const INITIAL_PRODUCT = { name:'', price:'', stock:'', category:'Alimentos' };
const INITIAL_CLIENT  = { name:'', phone:'', email:'' };
const INITIAL_PET     = { petName:'', breed:'', weight:'', ownerId:'', notes:'', history:[] };
const INITIAL_USER    = { name:'', email:'', password:'', role:'empleado' };
const INITIAL_APPO    = { petId:'', time:'', date:'', serviceId:'', status:'Pendiente', finalPrice:0 };

// ─── Helpers compartidos con el popup ────────────────────────────────────────
const hueFromId = (id) => {
    const n = typeof id === 'string'
        ? id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
        : Number(id);
    return (n * 137) % 360;
};

const getApptColor = (appt) => {
    if (appt.status === 'Atendido') return { bg: '#e1f5ee', border: '#1D9E75', text: '#085041' };
    const h = hueFromId(appt.petId);
    return { bg: `hsl(${h},70%,94%)`, border: `hsl(${h},60%,55%)`, text: `hsl(${h},55%,30%)` };
};

const formatDateLongAdmin = (str) => {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
};

// ─── Pop-up de cita (compartido admin/empleado) ───────────────────────────────
const ApptPopup = ({ appt, anchorRect, pets, clients, onMarkDone, onComplete, onDelete, onClose }) => {
    const popupRef = React.useRef(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0, placement: 'bottom' });

    const pet    = pets.find(p => String(p.id) === String(appt.petId));
    const owner  = pet ? clients.find(c => String(c.id) === String(pet.ownerId)) : null;
    const isDone = appt.status === 'Atendido';
    const color  = getApptColor(appt);

    useEffect(() => {
        if (!anchorRect || !popupRef.current) return;
        const W  = window.innerWidth;
        const H  = window.innerHeight;
        const PW = 300;
        const PH = popupRef.current.offsetHeight || 340;
        const GAP = 10;

        if (W < 600) { setPos({ mobile: true }); return; }

        let left = anchorRect.left + anchorRect.width / 2 - PW / 2;
        left = Math.max(12, Math.min(left, W - PW - 12));

        let top, placement;
        if (anchorRect.bottom + GAP + PH < H) {
            top = anchorRect.bottom + GAP;
            placement = 'bottom';
        } else {
            top = anchorRect.top - GAP - PH;
            placement = 'top';
        }
        top = Math.max(12, top);
        setPos({ top, left, placement, mobile: false });
    }, [anchorRect]);

    useEffect(() => {
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
        };
        const t = setTimeout(() => document.addEventListener('mousedown', handler), 80);
        return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
    }, [onClose]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const popupStyle = pos.mobile
        ? {}
        : { position: 'fixed', top: pos.top, left: pos.left, zIndex: 2000 };

    return (
        <>
            <div className="appt-popup-backdrop" onClick={onClose} />
            <div
                ref={popupRef}
                className={`appt-popup ${pos.mobile ? 'appt-popup--mobile' : ''} ${pos.placement === 'top' ? 'appt-popup--above' : ''}`}
                style={popupStyle}
                role="dialog"
                aria-modal="true"
            >
                <div className="appt-popup-bar" style={{ background: color.border }} />

                <div className="appt-popup-header">
                    <div className="appt-popup-avatar" style={{ background: `hsl(${hueFromId(appt.petId)},65%,60%)` }}>
                        {pet?.petName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="appt-popup-title">
                        <strong>{pet?.petName || 'Mascota'}</strong>
                        <span>{pet?.breed || '—'} · {pet?.weight} kg</span>
                        {owner && <span className="appt-popup-owner">{owner.name}{owner.phone ? ` · ${owner.phone}` : ''}</span>}
                    </div>
                    <button className="appt-popup-close" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="appt-popup-body">
                    <div className="appt-popup-row">
                        <FaClock className="appt-popup-icon" />
                        <span>{appt.time || '—'} · {formatDateLongAdmin(appt.date)}</span>
                    </div>
                    <div className="appt-popup-row">
                        <FaNotesMedical className="appt-popup-icon" />
                        <span>{appt.serviceName || '—'}</span>
                        <strong className="appt-popup-price">${appt.finalPrice || 0}</strong>
                    </div>
                    <div className="appt-popup-row">
                        <span className={`appt-popup-status ${isDone ? 'done' : 'pending'}`}>
                            {isDone ? <FaCheckCircle /> : <FaClock />} {appt.status}
                        </span>
                    </div>
                    {pet?.notes && (
                        <div className="appt-popup-notes">
                            <span className="appt-popup-notes-label">Notas / alergias</span>
                            <p>{pet.notes}</p>
                        </div>
                    )}
                    {pet?.history?.length > 0 && (
                        <div className="appt-popup-notes appt-popup-notes--visit">
                            <span className="appt-popup-notes-label">Última visita</span>
                            <p><strong>{pet.history[pet.history.length - 1].date}</strong> — {pet.history[pet.history.length - 1].detail}</p>
                        </div>
                    )}
                </div>

                <div className="appt-popup-actions">
                    {/* Botón de cobrar — solo en admin */}
                    {!isDone && onComplete && (
                        <button className="appt-popup-btn appt-popup-btn--done"
                            onClick={() => { onComplete(appt); onClose(); }}>
                            <FaCashRegister /> Cobrar ${appt.finalPrice}
                        </button>
                    )}
                    {/* Marcar atendido — solo en empleado */}
                    {!isDone && onMarkDone && !onComplete && (
                        <button className="appt-popup-btn appt-popup-btn--done"
                            onClick={() => { onMarkDone(appt); onClose(); }}>
                            <FaCheckCircle /> Atendido
                        </button>
                    )}
                    {onDelete && (
                        <button className="appt-popup-btn appt-popup-btn--del"
                            onClick={() => { onDelete(appt.id); onClose(); }}>
                            <FaTrash />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const AdminDashboard = () => {
    const {
        services, products, pets, clients, sales,
        addService, updateService, deleteService,
        addProduct, updateProduct, deleteProduct,
        addClient, updateClient, deleteClient,
        addPet, updatePet, deletePet, addSale,
    } = useData();
    const { logout, user } = useAuth();

    const { toasts, addToast, removeToast } = useToast();
    const { confirm, ConfirmNode } = useConfirm();

    const [tab, setTab] = useState('control');

    // FIX BUG#1: editingId ahora incluye el tipo para evitar colisiones entre secciones
    const [editing, setEditing] = useState({ id: null, type: null }); // { id, type: 'service'|'product'|'client'|'pet' }

    const [searchTerm, setSearchTerm] = useState('');

    // ── Modales de drill-down ──────────────────────────────────────────────────
    const [activeModal, setActiveModal] = useState(null);

    // ── Agenda ─────────────────────────────────────────────────────────────────
    const [appointments, setAppointments] = useState([]);
    const [apptLoading,  setApptLoading]  = useState(false);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [adminApptAnchor, setAdminApptAnchor] = useState(null);
    const [showAppoForm, setShowAppoForm] = useState(false);
    // FIX BUG#4: el formulario de cita ahora incluye campo date con valor por defecto
    const [appoForm, setAppoForm] = useState(INITIAL_APPO);

    const loadAppointments = useCallback(async () => {
        setApptLoading(true);
        try { setAppointments(await appointmentsApi.getAll()); }
        catch(e) {
            console.error(e);
            addToast('Error al cargar citas', 'error');
        }
        finally { setApptLoading(false); }
    }, [addToast]);

    useEffect(() => { loadAppointments(); }, [loadAppointments]);

    // ── Usuarios ───────────────────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [userForm, setUserForm] = useState(INITIAL_USER);
    const [editingUserId, setEditingUserId] = useState(null);

    useEffect(() => {
        usersApi.getAll().then(setUsers).catch(e => {
            console.error(e);
            addToast('Error al cargar usuarios', 'error');
        });
    }, []);

    // ── POS ────────────────────────────────────────────────────────────────────
    const [cart,         setCart]         = useState([]);
    const [posSearch,    setPosSearch]    = useState('');
    const [posCategory,  setPosCategory]  = useState('Todos');
    const [posClientId,  setPosClientId]  = useState('');
    const [showCheckout, setShowCheckout] = useState(false);

    // ── Formularios CRUD ───────────────────────────────────────────────────────
    const [serviceForm, setServiceForm] = useState(INITIAL_SERVICE);
    const [productForm, setProductForm] = useState(INITIAL_PRODUCT);
    const [clientForm,  setClientForm]  = useState(INITIAL_CLIENT);
    const [petForm,     setPetForm]     = useState(INITIAL_PET);

    // ── Precio dinámico ────────────────────────────────────────────────────────
    const calcPrice = (base, weight) => {
        const w = Number(weight), p = Number(base);
        if (w <= 5)  return p;
        if (w <= 12) return +(p * 1.25).toFixed(2);
        if (w <= 25) return +(p * 1.50).toFixed(2);
        return +(p * 2).toFixed(2);
    };

    useEffect(() => {
        if (appoForm.petId && appoForm.serviceId) {
            const pet = pets.find(p => String(p.id) === String(appoForm.petId));
            const svc = services.find(s => String(s.id) === String(appoForm.serviceId));
            if (pet && svc) setAppoForm(prev => ({ ...prev, finalPrice: calcPrice(svc.price, pet.weight) }));
        }
    }, [appoForm.petId, appoForm.serviceId, pets, services]);

    // ── Stats ──────────────────────────────────────────────────────────────────
    const now = new Date();
    // FIX MEJORA#4: citas activas = las de hoy específicamente
    const todayStr = now.toISOString().split('T')[0];
    const stats = useMemo(() => {
        const monthSales = sales.filter(s => isSameMonth(s.date, now.getFullYear(), now.getMonth()));
        const todayAppts = appointments.filter(a => a.date === todayStr);
        return {
            monthSales:        monthSales.reduce((a, s) => a + Number(s.price), 0),
            appointmentsCount: todayAppts.length,
            totalClients:      clients.length,
            lowStock:          products.filter(p => Number(p.stock) < 5).length,
        };
    }, [sales, appointments, clients, products, todayStr]);

    // ── POS ────────────────────────────────────────────────────────────────────
    const addToCart = (item, type) => {
        if (type === 'product' && item.stock <= 0) {
            addToast('Sin stock disponible', 'error');
            return;
        }
        const ex = cart.find(c => c.id === item.id && c.type === type);
        if (ex) setCart(cart.map(c => c.id === item.id && c.type === type ? { ...c, qty: c.qty + 1 } : c));
        else    setCart([...cart, { ...item, qty: 1, type }]);
    };
    const removeFromCart = (id, type) => setCart(cart.filter(c => !(c.id === id && c.type === type)));
    const cartTotal = cart.reduce((a, i) => a + i.price * i.qty, 0);

    const processCheckout = async () => {
        if (cart.length === 0) return;
        try {
            const summary = cart.map(i => `${i.qty}x ${i.name || i.title}`).join(', ');
            await addSale(summary, +cartTotal.toFixed(2), posClientId || null);
            for (const item of cart) {
                if (item.type === 'product') {
                    const orig = products.find(p => p.id === item.id);
                    if (orig) await updateProduct(item.id, { ...orig, stock: orig.stock - item.qty });
                }
            }
            setCart([]);
            setPosClientId('');
            setShowCheckout(false);
            addToast('¡Venta procesada correctamente!', 'success');
        } catch(e) {
            console.error(e);
            addToast('Error al procesar la venta', 'error');
        }
    };

    // ── CRUD genérico ──────────────────────────────────────────────────────────
    const handleSave = async (type, e) => {
        e.preventDefault();
        try {
            if (type === 'service') editing.id ? await updateService(editing.id, serviceForm) : await addService(serviceForm);
            if (type === 'product') editing.id ? await updateProduct(editing.id, productForm) : await addProduct(productForm);
            if (type === 'client')  editing.id ? await updateClient(editing.id, clientForm)   : await addClient(clientForm);
            if (type === 'pet')     editing.id ? await updatePet(editing.id, petForm)         : await addPet(petForm);
            addToast(editing.id ? 'Registro actualizado' : 'Registro guardado', 'success');
            cancelEdit();
        } catch(e) {
            console.error(e);
            addToast('Error al guardar', 'error');
        }
    };

    // FIX BUG#1: startEdit ahora guarda el tipo junto al id para evitar colisiones
    const startEdit = (type, item) => {
        setEditing({ id: item.id, type });
        if (type === 'service') setServiceForm(item);
        if (type === 'product') setProductForm(item);
        if (type === 'client')  setClientForm(item);
        if (type === 'pet')     setPetForm(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // FIX BUG#1 + WARN#4: cancelEdit limpia tanto editing como editingUserId
    const cancelEdit = () => {
        setEditing({ id: null, type: null });
        setServiceForm(INITIAL_SERVICE);
        setProductForm(INITIAL_PRODUCT);
        setClientForm(INITIAL_CLIENT);
        setPetForm(INITIAL_PET);
    };

    // ── Delete con confirmación ────────────────────────────────────────────────
    // FIX BUG#3: todos los deletes pasan por el diálogo de confirmación
    const handleDelete = async (type, id, label) => {
        const ok = await confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`);
        if (!ok) return;
        try {
            if (type === 'service') await deleteService(id);
            if (type === 'product') await deleteProduct(id);
            if (type === 'client')  await deleteClient(id);
            if (type === 'pet')     await deletePet(id);
            addToast('Registro eliminado', 'info');
        } catch(e) {
            console.error(e);
            addToast('Error al eliminar', 'error');
        }
    };

    // ── Agenda CRUD ────────────────────────────────────────────────────────────
    const handleAddAppointment = async (e) => {
        e.preventDefault();
        const svc = services.find(s => String(s.id) === String(appoForm.serviceId));
        const pet = pets.find(p => String(p.id) === String(appoForm.petId));
        // FIX BUG#4: usa la fecha elegida por el usuario, no la fecha de hoy hardcodeada
        const dateToUse = appoForm.date || new Date().toISOString().split('T')[0];
        try {
            const created = await appointmentsApi.create({
                ...appoForm,
                serviceName: svc?.title,
                petName:     pet?.petName,
                date:        dateToUse,
            });
            setAppointments(prev => [...prev, created]);
            setShowAppoForm(false);
            setAppoForm(INITIAL_APPO);
            addToast('Cita agendada', 'success');
        } catch(e) {
            console.error(e);
            addToast('Error al crear la cita', 'error');
            // FIX BUG#4: el formulario NO se cierra si hay error
        }
    };

    // FIX BUG#5: completeService ahora pasa el clientId del dueño de la mascota
    // FIX WARN#1: pide confirmación antes de cobrar
    const completeService = async (appo) => {
        const ok = await confirm(
            `¿Cobrar servicio "${appo.serviceName}" de ${appo.petName} por $${appo.finalPrice}?`
        );
        if (!ok) return;
        try {
            const pet = pets.find(p => String(p.id) === String(appo.petId));
            // FIX BUG#5: se recupera el clientId del dueño de la mascota
            const ownerClientId = pet?.ownerId || null;

            await addSale(
                `Servicio: ${appo.serviceName} (${appo.petName})`,
                Number(appo.finalPrice),
                ownerClientId   // ← antes era siempre null
            );
            if (pet) {
                await updatePet(pet.id, {
                    ...pet,
                    history: [...(pet.history || []), {
                        date:   new Date().toLocaleDateString(),
                        detail: `${appo.serviceName} completado — $${appo.finalPrice}`
                    }]
                });
            }
            try { await appointmentsApi.delete(appo.id); } catch {}
            setAppointments(prev => prev.filter(a => a.id !== appo.id));
            setSelectedAppt(null);
            addToast('Servicio cobrado y registrado', 'success');
        } catch(e) {
            console.error(e);
            addToast('Error al cobrar el servicio', 'error');
        }
    };

    const deleteAppointment = async (id) => {
        const ok = await confirm('¿Eliminar esta cita? No se registrará la venta.');
        if (!ok) return;
        try { await appointmentsApi.delete(id); } catch {}
        setAppointments(prev => prev.filter(a => a.id !== id));
        if (selectedAppt?.id === id) setSelectedAppt(null);
        addToast('Cita eliminada', 'info');
    };

    // ── Usuarios CRUD ──────────────────────────────────────────────────────────
    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            // FIX WARN#3: al editar, si la contraseña está vacía no se incluye en el payload
            const payload = { ...userForm, id: editingUserId };
            if (editingUserId && !userForm.password) {
                delete payload.password;
            }
            if (editingUserId) {
                const saved = await usersApi.update(editingUserId, payload);
                setUsers(prev => prev.map(u => u.id === editingUserId ? saved : u));
                addToast('Usuario actualizado', 'success');
            } else {
                const created = await usersApi.create(payload);
                setUsers(prev => [...prev, created]);
                addToast('Usuario creado', 'success');
            }
            setUserForm(INITIAL_USER);
            setEditingUserId(null);
        } catch(e) {
            console.error(e);
            addToast('Error al guardar usuario', 'error');
        }
    };

    const deleteUser = async (id) => {
        const u = users.find(u => u.id === id);
        const ok = await confirm(`¿Eliminar al usuario "${u?.name}"?`);
        if (!ok) return;
        try {
            await usersApi.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            addToast('Usuario eliminado', 'info');
        } catch(e) {
            console.error(e);
            addToast('Error al eliminar usuario', 'error');
        }
    };

    // FIX WARN#4: cancelar edición de usuario también limpia editingUserId
    const cancelUserEdit = () => {
        setEditingUserId(null);
        setUserForm(INITIAL_USER);
    };

    // ── Exportar Excel ─────────────────────────────────────────────────────────
    const downloadExcelReport = () => {
        const ws = XLSX.utils.json_to_sheet(sales.map(s => ({
            Fecha: s.date, Item: s.item, Monto: s.price
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
        XLSX.writeFile(wb, 'Reporte_Ventas_Perrucho.xlsx');
    };

    // ── Filtros POS ────────────────────────────────────────────────────────────
    const posProducts = products.filter(p => p.name?.toLowerCase().includes(posSearch.toLowerCase()));
    const posServices = services.filter(s => s.title?.toLowerCase().includes(posSearch.toLowerCase()));

    // FIX BUG#6: filtros de búsqueda por sección
    // Cada tabla tiene su propio término de búsqueda con el searchTerm global
    const filteredClients  = clients.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredPets = pets.filter(p =>
        p.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.breed?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredServices = services.filter(s =>
        s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── Buscador con placeholder contextual ────────────────────────────────────
    const searchPlaceholder = {
        control:   'Buscar...',
        pos:       'Buscar en catálogo (usa el buscador del POS)',
        clientes:  'Buscar cliente...',
        pacientes: 'Buscar mascota...',
        servicios: 'Buscar servicio...',
        productos: 'Buscar producto...',
        usuarios:  'Buscar usuario...',
    };

    const NAV = [
        { id:'control',   icon:<FaTachometerAlt />, label:'Panel'     },
        { id:'pos',       icon:<FaCashRegister />,  label:'Venta'     },
        { id:'clientes',  icon:<FaUsers />,          label:'Clientes'  },
        { id:'pacientes', icon:<FaPaw />,            label:'Pacientes' },
        { id:'servicios', icon:<FaCut />,            label:'Servicios' },
        { id:'productos', icon:<FaBoxOpen />,        label:'Inventario'},
        { id:'usuarios',  icon:<FaUserCog />,        label:'Usuarios'  },
    ];

    // ── Helpers de formulario ──────────────────────────────────────────────────
    // Para determinar si el formulario actual está en modo edición del tipo correcto
    const isEditing = (type) => editing.type === type && editing.id !== null;

    return (
        <div className="admin-layout">

            {/* ── TOASTS ── */}
            <div className="toast-container">
                {toasts.map(t => (
                    <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
                ))}
            </div>

            {/* ── DIÁLOGO DE CONFIRMACIÓN ── */}
            {ConfirmNode}

            {/* ── MODALES DRILL-DOWN ── */}
            {activeModal === 'ventas' && (
                <SalesModal sales={sales} onClose={() => setActiveModal(null)} />
            )}
            {activeModal === 'pacientes' && (
                <PatientsModal
                    appointments={appointments}
                    pets={pets} clients={clients} services={services}
                    onClose={() => setActiveModal(null)}
                />
            )}
            {activeModal === 'clientes' && (
                <ClientsModal
                    sales={sales} clients={clients} pets={pets}
                    onClose={() => setActiveModal(null)}
                />
            )}
            {activeModal === 'stock' && (
                <StockModal products={products} onClose={() => setActiveModal(null)} />
            )}

            {/* ── MODAL CHECKOUT POS ── */}
            {showCheckout && (
                <Modal title="Confirmar venta" onClose={() => setShowCheckout(false)}>
                    <p className="checkout-modal-note">
                        Selecciona el cliente (opcional) antes de finalizar.
                    </p>
                    <select
                        value={posClientId}
                        onChange={e => setPosClientId(e.target.value)}
                        className="checkout-client-select"
                    >
                        <option value="">Sin cliente / venta directa</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="checkout-items-preview">
                        {cart.map((item, i) => (
                            <div key={i} className="checkout-item-row">
                                <span>{item.qty}x {item.name || item.title}</span>
                                <span>${(item.price * item.qty).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="checkout-total-row">
                        <span>Total</span>
                        <strong>${cartTotal.toFixed(2)}</strong>
                    </div>
                    <div className="form-actions" style={{marginTop:'16px'}}>
                        <button className="btn-primary" onClick={processCheckout}>
                            <FaReceipt /> Confirmar venta
                        </button>
                        <button className="btn-secondary" onClick={() => setShowCheckout(false)}>
                            Cancelar
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── TOPBAR ── */}
            <header className="admin-top-bar">
                <div className="topbar-left">
                    <span className="admin-logo">perrucho<span>.</span></span>
                    {/* FIX BUG#6: buscador global con placeholder contextual */}
                    {tab !== 'pos' && (
                        <div className="search-bar-global">
                            <FaSearch />
                            <input
                                type="text"
                                placeholder={searchPlaceholder[tab] || 'Buscar...'}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:0}}
                                    onClick={() => setSearchTerm('')}
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="topbar-right">
                    <div className="user-pill"><FaUserShield /><span>{user?.name}</span></div>
                    <button className="logout-pill" onClick={logout} title="Cerrar sesión"><FaSignOutAlt /></button>
                </div>
            </header>

            {/* ── SIDEBAR ── */}
            <aside className="admin-sidebar">
                <nav className="sidebar-nav">
                    {NAV.map(item => (
                        <button
                            key={item.id}
                            className={`nav-btn ${tab === item.id ? 'active' : ''}`}
                            onClick={() => { setTab(item.id); setSearchTerm(''); }}
                            title={item.label}
                        >
                            {item.icon}
                            <span className="nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>
                <button className="sidebar-logout" onClick={logout} title="Cerrar sesión"><FaSignOutAlt /></button>
            </aside>

            {/* ── MAIN ── */}
            <main className="admin-main-panel">

                {/* ══ PANEL CONTROL ══ */}
                {tab === 'control' && (
                    <div className="fade-in">
                        <div className="page-header">
                            <h2>Panel de control</h2>
                            <p>{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card stat-card--blue clickable" onClick={() => setActiveModal('ventas')}>
                                <span className="stat-label">Ventas del mes</span>
                                <span className="stat-value">${stats.monthSales.toLocaleString()}</span>
                                <span className="stat-hint">Ver detalle →</span>
                            </div>
                            {/* FIX MEJORA#4: muestra citas de hoy, no el total */}
                            <div className="stat-card stat-card--teal clickable" onClick={() => setActiveModal('pacientes')}>
                                <span className="stat-label">Citas hoy</span>
                                <span className="stat-value">{stats.appointmentsCount}</span>
                                <span className="stat-hint">Ver agenda →</span>
                            </div>
                            <div className="stat-card stat-card--purple clickable" onClick={() => setActiveModal('clientes')}>
                                <span className="stat-label">Clientes</span>
                                <span className="stat-value">{stats.totalClients}</span>
                                <span className="stat-hint">Reporte por día →</span>
                            </div>
                            <div className="stat-card stat-card--red clickable" onClick={() => setActiveModal('stock')}>
                                <span className="stat-label">Stock crítico</span>
                                <span className="stat-value">{stats.lowStock}</span>
                                <span className="stat-hint">Ver productos →</span>
                            </div>
                        </div>
                        <div className="control-lower-grid">
                            <div className="panel-card">
                                <div className="panel-card-header">
                                    <h4><FaChartBar /> Servicios por categoría (mes)</h4>
                                </div>
                                <ServiceChart sales={sales} services={services} />
                            </div>
                            <div className="panel-card">
                                <div className="panel-card-header">
                                    <h4><FaDollarSign /> Ventas esta semana</h4>
                                </div>
                                <WeeklyChart sales={sales} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ POS ══ */}
                {tab === 'pos' && (
                    <div className="fade-in">
                        <div className="page-header">
                            <h2>Punto de venta</h2>
                            <p>Venta directa de productos y servicios</p>
                        </div>
                        <div className="pos-container">
                            <div className="pos-catalog">
                                <div className="pos-search-row">
                                    <div className="search-input-wrapper">
                                        <FaSearch />
                                        <input
                                            type="text"
                                            placeholder="Buscar producto o servicio..."
                                            value={posSearch}
                                            onChange={e => setPosSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="pos-filters">
                                        {['Todos','Productos','Servicios'].map(cat => (
                                            <button
                                                key={cat}
                                                className={posCategory === cat ? 'active' : ''}
                                                onClick={() => setPosCategory(cat)}
                                            >{cat}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pos-grid">
                                    {(posCategory==='Todos'||posCategory==='Productos') && posProducts.map(p => (
                                        <div key={p.id} className={`pos-card ${p.stock <= 0 ? 'pos-card--disabled' : ''}`}
                                            onClick={() => addToCart(p,'product')}>
                                            <div className="pos-card-icon product-icon"><FaBoxOpen /></div>
                                            <h5>{p.name}</h5>
                                            <p className="pos-price">${p.price}</p>
                                            <span className={p.stock < 5 ? 'low-stock' : 'in-stock'}>
                                                {p.stock <= 0 ? 'Sin stock' : `Stock: ${p.stock}`}
                                            </span>
                                        </div>
                                    ))}
                                    {(posCategory==='Todos'||posCategory==='Servicios') && posServices.map(s => (
                                        <div key={s.id} className="pos-card pos-card--service" onClick={() => addToCart(s,'service')}>
                                            <div className="pos-card-icon service-icon"><FaCut /></div>
                                            <h5>{s.title}</h5>
                                            <p className="pos-price">${s.price}</p>
                                            {/* FIX WARN#2: aviso que el precio es base sin ajuste por peso */}
                                            <span className="in-stock" title="Precio base sin ajuste por peso de la mascota">Base*</span>
                                        </div>
                                    ))}
                                </div>
                                {/* FIX WARN#2: nota informativa */}
                                {(posCategory==='Todos'||posCategory==='Servicios') && posServices.length > 0 && (
                                    <p className="pos-note">
                                        * Los servicios vendidos desde el POS usan precio base. Para aplicar precio por peso de mascota, usa la sección Pacientes → Agenda.
                                    </p>
                                )}
                            </div>

                            <aside className="pos-cart">
                                <div className="pos-cart-header">
                                    <h4><FaCartPlus /> Carrito</h4>
                                    <button className="clear-cart-btn" onClick={() => setCart([])}>Vaciar</button>
                                </div>
                                <div className="pos-cart-items">
                                    {cart.length === 0 && <p className="empty-cart">El carrito está vacío</p>}
                                    {cart.map((item, i) => (
                                        <div key={`${item.id}-${i}`} className="cart-item">
                                            <div>
                                                <span className="cart-item-name">{item.qty}x {item.name||item.title}</span>
                                                <span className="cart-item-price">${(item.price*item.qty).toFixed(2)}</span>
                                            </div>
                                            <button onClick={() => removeFromCart(item.id, item.type)}>
                                                <FaTrashAlt />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="pos-cart-footer">
                                    <div className="cart-total-row">
                                        <span>Total</span>
                                        <span className="cart-total-amount">${cartTotal.toFixed(2)}</span>
                                    </div>
                                    <button
                                        className="checkout-btn"
                                        onClick={() => setShowCheckout(true)}
                                        disabled={cart.length === 0}
                                    >
                                        <FaReceipt /> Finalizar venta
                                    </button>
                                </div>
                            </aside>
                        </div>
                    </div>
                )}

                {/* ══ CLIENTES ══ */}
                {tab === 'clientes' && (
                    <div className="fade-in">
                        <div className="page-header">
                            <h2>Clientes</h2>
                            <p>{clients.length} clientes registrados</p>
                        </div>
                        <form onSubmit={e => handleSave('client', e)} className="dashboard-form">
                            <h4 className="form-title">{isEditing('client') ? 'Editar cliente' : 'Nuevo cliente'}</h4>
                            <div className="input-grid">
                                <input placeholder="Nombre" value={clientForm.name}
                                    onChange={e => setClientForm({...clientForm, name:e.target.value})} required />
                                <input placeholder="Teléfono" value={clientForm.phone}
                                    onChange={e => setClientForm({...clientForm, phone:e.target.value})} required />
                                <input placeholder="Email" type="email" value={clientForm.email}
                                    onChange={e => setClientForm({...clientForm, email:e.target.value})} required />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-primary">
                                    {isEditing('client') ? 'Actualizar' : 'Guardar cliente'}
                                </button>
                                {isEditing('client') && (
                                    <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                                )}
                            </div>
                        </form>
                        <div className="table-card">
                            <table className="data-table">
                                <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th></th></tr></thead>
                                <tbody>
                                    {filteredClients.length === 0
                                        ? <tr><td colSpan="4" className="empty-td">Sin resultados</td></tr>
                                        : filteredClients.map(c => (
                                            <tr key={c.id}>
                                                <td>{c.name}</td><td>{c.phone}</td><td>{c.email}</td>
                                                <td className="actions-cell">
                                                    <button className="btn-icon edit" onClick={() => startEdit('client', c)}><FaEdit /></button>
                                                    <button className="btn-icon del"  onClick={() => handleDelete('client', c.id, c.name)}><FaTrash /></button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ PACIENTES ══ */}
                {tab === 'pacientes' && (
                    <div className="fade-in">
                        <div className="page-header">
                            <h2>Pacientes</h2>
                            <p>{pets.length} mascotas registradas</p>
                        </div>
                        <div className="pacientes-layout">
                            <div className="pacientes-main">
                                <form onSubmit={e => handleSave('pet', e)} className="dashboard-form">
                                    <h4 className="form-title">{isEditing('pet') ? 'Editar paciente' : 'Nuevo paciente'}</h4>
                                    <div className="input-grid">
                                        <input placeholder="Nombre mascota" value={petForm.petName}
                                            onChange={e => setPetForm({...petForm, petName:e.target.value})} required />
                                        <input placeholder="Raza" value={petForm.breed}
                                            onChange={e => setPetForm({...petForm, breed:e.target.value})} />
                                        <input type="number" placeholder="Peso (kg)" value={petForm.weight}
                                            onChange={e => setPetForm({...petForm, weight:e.target.value})} required />
                                        <select value={petForm.ownerId}
                                            onChange={e => setPetForm({...petForm, ownerId:e.target.value})} required>
                                            <option value="">Seleccionar dueño...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <input placeholder="Notas / alergias" value={petForm.notes}
                                            onChange={e => setPetForm({...petForm, notes:e.target.value})}
                                            className="input-span2" />
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn-primary">
                                            {isEditing('pet') ? 'Actualizar' : 'Registrar paciente'}
                                        </button>
                                        {isEditing('pet') && (
                                            <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                                        )}
                                    </div>
                                </form>
                                <div className="pet-grid">
                                    {filteredPets.map(p => {
                                        const owner = clients.find(c => String(c.id) === String(p.ownerId));
                                        return (
                                            <div key={p.id} className="pet-card">
                                                <div className="pet-avatar">{p.petName?.[0]?.toUpperCase()}</div>
                                                <div className="pet-info">
                                                    <h5>{p.petName}</h5>
                                                    <span>{p.breed||'—'} · {p.weight} kg</span>
                                                    <span className="pet-owner">{owner?.name||'Sin dueño'}</span>
                                                </div>
                                                <div className="pet-actions">
                                                    <button className="btn-icon edit" onClick={() => startEdit('pet', p)}><FaEdit /></button>
                                                    <button className="btn-icon del"  onClick={() => handleDelete('pet', p.id, p.petName)}><FaTrash /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredPets.length === 0 && (
                                        <p className="empty-td">Sin resultados</p>
                                    )}
                                </div>
                            </div>

                            <aside className="agenda-panel">
                                <div className="agenda-panel-header">
                                    <h4><FaCalendarAlt /> Agenda</h4>
                                    <div style={{display:'flex',gap:6}}>
                                        {/* FIX MEJORA#3: botón de refresh manual */}
                                        <button className="btn-icon-round" onClick={loadAppointments} title="Actualizar citas"
                                            style={{background:'var(--accent-mint)',color:'#04342C'}}>
                                            <FaSync />
                                        </button>
                                        <button className="btn-icon-round" onClick={() => setShowAppoForm(v => !v)}>
                                            {showAppoForm ? <FaTimes /> : <FaPlusCircle />}
                                        </button>
                                    </div>
                                </div>
                                {showAppoForm && (
                                    <form className="appo-form" onSubmit={handleAddAppointment}>
                                        {/* FIX BUG#2: selects ahora son controlados con value= */}
                                        <select
                                            value={appoForm.petId}
                                            onChange={e => setAppoForm({...appoForm, petId:e.target.value})}
                                            required
                                        >
                                            <option value="">Paciente...</option>
                                            {pets.map(p => <option key={p.id} value={p.id}>{p.petName}</option>)}
                                        </select>
                                        <select
                                            value={appoForm.serviceId}
                                            onChange={e => setAppoForm({...appoForm, serviceId:e.target.value})}
                                            required
                                        >
                                            <option value="">Servicio...</option>
                                            {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                        </select>
                                        {/* FIX BUG#4: campo de fecha con valor por defecto = hoy */}
                                        <input
                                            type="date"
                                            value={appoForm.date || new Date().toISOString().split('T')[0]}
                                            onChange={e => setAppoForm({...appoForm, date:e.target.value})}
                                            required
                                        />
                                        <input
                                            type="time"
                                            value={appoForm.time}
                                            onChange={e => setAppoForm({...appoForm, time:e.target.value})}
                                            required
                                        />
                                        {appoForm.finalPrice > 0 && (
                                            <div className="appo-price-preview">
                                                Total estimado: <strong>${appoForm.finalPrice}</strong>
                                            </div>
                                        )}
                                        <button type="submit" className="btn-primary btn-sm">Confirmar cita</button>
                                    </form>
                                )}
                                <div className="agenda-list">
                                    {apptLoading && <p className="empty-msg">Cargando citas...</p>}
                                    {!apptLoading && appointments.length === 0 && <p className="empty-msg">Sin citas</p>}
                                    {appointments.map(a => (
                                        <div
                                            key={a.id}
                                            className={`agenda-ticket ${selectedAppt?.id===a.id ? 'selected' : ''}`}
                                            onClick={e => {
                                                if (selectedAppt?.id === a.id) {
                                                    setSelectedAppt(null); setAdminApptAnchor(null);
                                                } else {
                                                    setAdminApptAnchor(e.currentTarget.getBoundingClientRect());
                                                    setSelectedAppt(a);
                                                }
                                            }}
                                        >
                                            <div className="ticket-time"><FaClock /> {a.time}</div>
                                            <div className="ticket-body">
                                                <strong>{a.petName}</strong>
                                                <span>{a.serviceName}</span>
                                                <span className="ticket-date">{a.date}</span>
                                            </div>
                                            <div className="ticket-right">
                                                <span className="ticket-price">${a.finalPrice}</span>
                                                <button className="btn-icon del sm"
                                                    onClick={e => { e.stopPropagation(); deleteAppointment(a.id); }}>
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {selectedAppt && adminApptAnchor && (
                                    <ApptPopup
                                        appt={selectedAppt}
                                        anchorRect={adminApptAnchor}
                                        pets={pets}
                                        clients={clients}
                                        onComplete={completeService}
                                        onDelete={(id) => { deleteAppointment(id); setSelectedAppt(null); setAdminApptAnchor(null); }}
                                        onClose={() => { setSelectedAppt(null); setAdminApptAnchor(null); }}
                                    />
                                )}
                            </aside>
                        </div>
                    </div>
                )}

                {/* ══ SERVICIOS ══ */}
                {tab === 'servicios' && (
                    <div className="fade-in">
                        <div className="page-header"><h2>Servicios</h2><p>Catálogo y precios base</p></div>
                        <form onSubmit={e => handleSave('service', e)} className="dashboard-form">
                            <h4 className="form-title">{isEditing('service') ? 'Editar' : 'Nuevo servicio'}</h4>
                            <div className="input-grid">
                                <input placeholder="Nombre" value={serviceForm.title}
                                    onChange={e => setServiceForm({...serviceForm, title:e.target.value})} required />
                                <input type="number" placeholder="Precio base ($)" value={serviceForm.price}
                                    onChange={e => setServiceForm({...serviceForm, price:e.target.value})} required />
                                <input placeholder="Duración" value={serviceForm.duration}
                                    onChange={e => setServiceForm({...serviceForm, duration:e.target.value})} required />
                                <select value={serviceForm.category}
                                    onChange={e => setServiceForm({...serviceForm, category:e.target.value})}>
                                    <option value="Estética">Estética</option>
                                    <option value="Médico">Consulta</option>
                                    <option value="Higiene">Higiene</option>
                                </select>
                                <input placeholder="Descripción" value={serviceForm.description}
                                    onChange={e => setServiceForm({...serviceForm, description:e.target.value})}
                                    className="input-span2" />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-primary">Guardar</button>
                                {isEditing('service') && (
                                    <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                                )}
                            </div>
                        </form>
                        <div className="table-card">
                            <table className="data-table">
                                <thead><tr><th>Servicio</th><th>Categoría</th><th>Precio base</th><th>Duración</th><th></th></tr></thead>
                                <tbody>
                                    {filteredServices.length === 0
                                        ? <tr><td colSpan="5" className="empty-td">Sin resultados</td></tr>
                                        : filteredServices.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.title}</td>
                                                <td><span className="badge">{s.category}</span></td>
                                                <td>${s.price}</td><td>{s.duration}</td>
                                                <td className="actions-cell">
                                                    <button className="btn-icon edit" onClick={() => startEdit('service', s)}><FaEdit /></button>
                                                    <button className="btn-icon del"  onClick={() => handleDelete('service', s.id, s.title)}><FaTrash /></button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ INVENTARIO ══ */}
                {tab === 'productos' && (
                    <div className="fade-in">
                        <div className="page-header"><h2>Inventario</h2><p>Control de stock</p></div>
                        <form onSubmit={e => handleSave('product', e)} className="dashboard-form">
                            <h4 className="form-title">{isEditing('product') ? 'Editar' : 'Nuevo producto'}</h4>
                            <div className="input-grid">
                                <input placeholder="Nombre" value={productForm.name}
                                    onChange={e => setProductForm({...productForm, name:e.target.value})} required />
                                <input type="number" placeholder="Precio" value={productForm.price}
                                    onChange={e => setProductForm({...productForm, price:e.target.value})} required />
                                <input type="number" placeholder="Stock" value={productForm.stock}
                                    onChange={e => setProductForm({...productForm, stock:e.target.value})} required />
                                <select value={productForm.category}
                                    onChange={e => setProductForm({...productForm, category:e.target.value})}>
                                    <option value="Alimentos">Alimentos</option>
                                    <option value="Farmacia">Farmacia</option>
                                    <option value="Accesorios">Accesorios</option>
                                    <option value="Higiene">Higiene</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-primary">Guardar</button>
                                {isEditing('product') && (
                                    <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                                )}
                            </div>
                        </form>
                        <div className="table-card">
                            <table className="data-table">
                                <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Precio</th><th></th></tr></thead>
                                <tbody>
                                    {filteredProducts.length === 0
                                        ? <tr><td colSpan="5" className="empty-td">Sin resultados</td></tr>
                                        : filteredProducts.map(p => (
                                            <tr key={p.id}>
                                                <td>{p.name}</td>
                                                <td><span className="badge">{p.category}</span></td>
                                                <td><span className={p.stock < 5 ? 'stock-low' : 'stock-ok'}>{p.stock}</span></td>
                                                <td>${p.price}</td>
                                                <td className="actions-cell">
                                                    <button className="btn-icon edit" onClick={() => startEdit('product', p)}><FaEdit /></button>
                                                    <button className="btn-icon del"  onClick={() => handleDelete('product', p.id, p.name)}><FaTrash /></button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ USUARIOS ══ */}
                {tab === 'usuarios' && (
                    <div className="fade-in">
                        <div className="page-header"><h2>Gestión de usuarios</h2><p>Admins y empleados</p></div>
                        <form onSubmit={handleSaveUser} className="dashboard-form">
                            <h4 className="form-title">{editingUserId ? 'Editar usuario' : 'Nuevo usuario'}</h4>
                            <div className="input-grid">
                                <input placeholder="Nombre" value={userForm.name}
                                    onChange={e => setUserForm({...userForm, name:e.target.value})} required />
                                <input type="email" placeholder="Email" value={userForm.email}
                                    onChange={e => setUserForm({...userForm, email:e.target.value})} required />
                                {/* FIX WARN#3: contraseña no requerida al editar, con placeholder informativo */}
                                <input
                                    type="password"
                                    placeholder={editingUserId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                                    value={userForm.password}
                                    onChange={e => setUserForm({...userForm, password:e.target.value})}
                                    required={!editingUserId}
                                />
                                <select value={userForm.role}
                                    onChange={e => setUserForm({...userForm, role:e.target.value})}>
                                    <option value="empleado">Empleado</option>
                                    <option value="administrador">Administrador</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-primary">
                                    {editingUserId ? 'Actualizar' : 'Crear usuario'}
                                </button>
                                {editingUserId && (
                                    // FIX WARN#4: cancelar edición limpia correctamente
                                    <button type="button" className="btn-secondary" onClick={cancelUserEdit}>Cancelar</button>
                                )}
                            </div>
                        </form>
                        <div className="table-card">
                            <table className="data-table">
                                <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr></thead>
                                <tbody>
                                    {filteredUsers.length === 0
                                        ? <tr><td colSpan="4" className="empty-td">Sin resultados</td></tr>
                                        : filteredUsers.map(u => (
                                            <tr key={u.id}>
                                                <td>{u.name}</td><td>{u.email}</td>
                                                <td>
                                                    <span className={`badge badge--${u.role==='administrador' ? 'admin' : 'emp'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="actions-cell">
                                                    <button className="btn-icon edit" onClick={() => {
                                                        setEditingUserId(u.id);
                                                        setUserForm({ name:u.name, email:u.email, password:'', role:u.role });
                                                    }}><FaEdit /></button>
                                                    <button className="btn-icon del" onClick={() => deleteUser(u.id)}><FaTrash /></button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AdminDashboard;