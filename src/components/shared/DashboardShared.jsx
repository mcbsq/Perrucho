// src/components/shared/DashboardShared.jsx
// CAMBIOS v2 según catálogo de servicios real:
// 1. ServiceCard ahora muestra los 6 rangos de peso (Mini→Jumbo) en lugar de 3
// 2. ServiceFormModal ahora tiene campos para los 6 precios (priceMini→priceJumbo)
// 3. Se importa pricingRules para labels y rangos consistentes

import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes, FaEdit, FaTrash, FaUser, FaPaw, FaCut, FaBoxOpen,
    FaUserCog, FaPhone, FaEnvelope, FaWeight, FaDog, FaCat,
    FaFeather, FaPlus, FaExclamationTriangle, FaCheckCircle,
    FaClock, FaTag, FaLayerGroup
} from 'react-icons/fa';
import { formatMexPhone } from '../../utils/formatPhone';
import BreedCombobox from '../BreedCombobox/BreedCombobox';
import { STATUS_COLORS, STATUS_EMOJI } from '../../utils/apptStatus';
import { WEIGHT_RANGES, PRICE_FIELD } from '../../utils/pricingRules';

// ─── Emoji por especie ────────────────────────────────────────────────────────
export const speciesEmoji = (sp) => {
    if (!sp) return '🐾';
    const s = sp.toLowerCase();
    if (s.includes('perro')) return '🐕';
    if (s.includes('gato'))  return '🐈';
    if (s.includes('ave'))   return '🦜';
    if (s.includes('conejo'))return '🐇';
    return '🐾';
};

export const hueFromId = (id) => {
    const n = typeof id === 'string'
        ? id.split('').reduce((a,c) => a + c.charCodeAt(0), 0)
        : Number(id);
    return (n * 137) % 360;
};

// ─── FAB Button ───────────────────────────────────────────────────────────────
export const FAB = ({ onClick, title = 'Agregar', color = '#74b9ff' }) => (
    <button className="ds-fab" onClick={onClick} title={title}
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <FaPlus />
    </button>
);

// ─── Generic Modal ────────────────────────────────────────────────────────────
export const DSModal = ({ title, onClose, children, wide }) => (
    <div className="ds-modal-overlay" onClick={onClose}>
        <div className={`ds-modal ${wide ? 'ds-modal--wide' : ''}`}
            onClick={e => e.stopPropagation()}>
            <div className="ds-modal-header">
                <h3>{title}</h3>
                <button className="ds-modal-close" onClick={onClose}><FaTimes /></button>
            </div>
            <div className="ds-modal-body">{children}</div>
        </div>
    </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS['Pendiente'];
    return (
        <span className="ds-status-badge"
            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
            <span className="ds-status-dot" style={{ background: c.dot }} />
            {STATUS_EMOJI[status]} {status}
        </span>
    );
};

// ─── Status Selector ─────────────────────────────────────────────────────────
export const StatusSelector = ({ current, transitions, onSelect }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const options = transitions[current] || [];

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    if (options.length === 0) return <StatusBadge status={current} />;

    return (
        <div className="ds-status-selector" ref={ref}>
            <button className="ds-status-trigger" onClick={() => setOpen(v => !v)}>
                <StatusBadge status={current} />
                <span className="ds-status-arrow">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="ds-status-dropdown">
                    <div className="ds-status-dropdown-label">Cambiar a:</div>
                    {options.map(s => {
                        const c = STATUS_COLORS[s];
                        return (
                            <button key={s} className="ds-status-option"
                                style={{ '--opt-border': c.border, '--opt-bg': c.bg, '--opt-text': c.text }}
                                onClick={() => { onSelect(s); setOpen(false); }}>
                                {STATUS_EMOJI[s]} {s}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── CLIENT CARD ──────────────────────────────────────────────────────────────
export const ClientCard = ({ client, petsCount = 0, onEdit, onDelete }) => (
    <div className="ds-card ds-client-card">
        <div className="ds-card-avatar" style={{ background: `hsl(${hueFromId(client.id)},55%,62%)` }}>
            {client.name?.[0]?.toUpperCase()}
        </div>
        <div className="ds-card-body">
            <div className="ds-card-name">{client.name}</div>
            <div className="ds-card-meta">
                {client.phone && <span><FaPhone/> {client.phone}</span>}
                {client.email && <span><FaEnvelope/> {client.email}</span>}
            </div>
            <div className="ds-card-tags">
                <span className="ds-tag ds-tag--blue"><FaPaw/> {petsCount} mascota{petsCount !== 1 ? 's' : ''}</span>
            </div>
        </div>
        <div className="ds-card-actions">
            <button className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(client)}><FaEdit /></button>
            <button className="ds-btn-icon ds-btn-icon--del"  onClick={() => onDelete(client.id, client.name)}><FaTrash /></button>
        </div>
    </div>
);

// ─── CLIENT FORM MODAL ────────────────────────────────────────────────────────
export const ClientFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState(initial || { name: '', phone: '', email: '' });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    return (
        <DSModal title={isEdit ? `✏️ Editar — ${initial.name}` : '👤 Nuevo cliente'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre completo</label>
                    <input placeholder="Nombre" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <label>Teléfono</label>
                    <input placeholder="55 1234 5678" value={form.phone}
                        onChange={e => setForm({ ...form, phone: formatMexPhone(e.target.value) })}
                        inputMode="numeric" required />
                    <label>Correo electrónico</label>
                    <input type="email" placeholder="correo@ejemplo.com" value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="ds-form-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar cliente')}
                    </button>
                </div>
            </form>
        </DSModal>
    );
};

// ─── PET CARD ─────────────────────────────────────────────────────────────────
export const PetCard = ({ pet, owner, onEdit, onDelete }) => {
    const h = hueFromId(pet.id);
    const emoji = speciesEmoji(pet.species);
    return (
        <div className="ds-card ds-pet-card">
            <div className="ds-pet-avatar" style={{ background: `hsl(${h},65%,60%)` }}>
                <span className="ds-pet-initial">{pet.petName?.[0]?.toUpperCase()}</span>
                <span className="ds-pet-emoji-badge">{emoji}</span>
            </div>
            <div className="ds-card-body">
                <div className="ds-card-name">{pet.petName}</div>
                <div className="ds-card-meta">
                    <span className="ds-tag ds-tag--purple">{emoji} {pet.species || 'mascota'}</span>
                    {pet.breed  && <span className="ds-tag ds-tag--gray">{pet.breed}</span>}
                    {pet.weight && <span className="ds-tag ds-tag--gray"><FaWeight/> ~{pet.weight} kg</span>}
                </div>
                {owner && <div className="ds-card-owner">👤 {owner.name}</div>}
                {pet.notes && <div className="ds-card-notes">📌 {pet.notes}</div>}
            </div>
            <div className="ds-card-actions">
                <button className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(pet)}><FaEdit /></button>
                <button className="ds-btn-icon ds-btn-icon--del"  onClick={() => onDelete(pet.id, pet.petName)}><FaTrash /></button>
            </div>
        </div>
    );
};

// ─── PET FORM MODAL ───────────────────────────────────────────────────────────
export const PetFormModal = ({ initial, clients, onSave, onClose }) => {
    const [form, setForm] = useState(initial || {
        petName: '', species: 'perro', breed: '', weight: '', ownerId: '', notes: '', history: []
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    return (
        <DSModal title={isEdit ? `✏️ Editar — ${initial.petName}` : '🐾 Nuevo paciente'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre</label>
                    <input placeholder="Nombre mascota" value={form.petName}
                        onChange={e => setForm({ ...form, petName: e.target.value })} required />
                    <label>Especie</label>
                    <select value={form.species}
                        onChange={e => setForm({ ...form, species: e.target.value, breed: '' })}>
                        <option value="perro">🐕 Perro</option>
                        <option value="gato">🐈 Gato</option>
                        <option value="ave">🦜 Ave</option>
                        <option value="otro">🐾 Otro</option>
                    </select>
                    <label>Raza</label>
                    <BreedCombobox value={form.breed}
                        onChange={v => setForm({ ...form, breed: v })}
                        species={form.species} />
                    <label>Peso aprox. (kg)</label>
                    <input type="number" placeholder="Ej: 5" value={form.weight}
                        onChange={e => setForm({ ...form, weight: e.target.value })} required />
                    <label>Dueño</label>
                    <select value={form.ownerId}
                        onChange={e => setForm({ ...form, ownerId: e.target.value })} required>
                        <option value="">Seleccionar dueño...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <label>Notas / alergias</label>
                    <input placeholder="Condiciones especiales, medicamentos..." value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        style={{ gridColumn: '1 / -1' }} />
                </div>
                <div className="ds-form-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Registrar paciente')}
                    </button>
                </div>
            </form>
        </DSModal>
    );
};

// ─── SERVICE CARD ─────────────────────────────────────────────────────────────
// CAMBIO: ahora muestra los 6 rangos de peso en lugar de 3
export const ServiceCard = ({ service, onEdit, onDelete }) => (
    <div className="ds-card ds-service-card">
        <div className="ds-service-icon">{service.icon || '✂️'}</div>
        <div className="ds-card-body">
            <div className="ds-card-name">{service.title}</div>
            <div className="ds-card-meta">
                <span className="ds-tag ds-tag--blue">{service.category}</span>
            </div>
            {/* Tabla de precios con los 6 rangos */}
            <div className="ds-service-prices-grid">
                {WEIGHT_RANGES.map(range => {
                    const field = PRICE_FIELD[range.key];
                    const price = service[field] ?? service.price ?? 0;
                    return (
                        <div key={range.key} className="ds-service-price-item">
                            <span className="ds-service-price-label">{range.label}</span>
                            <span className="ds-service-price-desc">{range.desc}</span>
                            <strong className="ds-service-price-value">${price}</strong>
                        </div>
                    );
                })}
            </div>
        </div>
        <div className="ds-card-actions">
            <button className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(service)}><FaEdit /></button>
            <button className="ds-btn-icon ds-btn-icon--del"  onClick={() => onDelete(service.id, service.title)}><FaTrash /></button>
        </div>
    </div>
);

// ─── SERVICE FORM MODAL ───────────────────────────────────────────────────────
// CAMBIO: ahora tiene los 6 campos de precio (priceMini→priceJumbo)
export const ServiceFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState(initial || {
        title: '', category: 'Estética', description: '', icon: '', color: 'blue', popular: false,
        priceMini: '', priceChico: '', priceMediano: '', priceGrande: '', priceExtra: '', priceJumbo: '',
        price: '', // precio base (se usará como fallback y para el POS)
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        // price base = priceMini para mantener compatibilidad con POS y ServiceCard legacy
        const payload = { ...form, price: form.priceMini || form.price };
        try { await onSave(payload); }
        finally { setSaving(false); }
    };

    return (
        <DSModal title={isEdit ? `✏️ Editar — ${initial.title}` : '✂️ Nuevo servicio'} onClose={onClose} wide>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre</label>
                    <input placeholder="Nombre del servicio" value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })} required />
                    <label>Categoría</label>
                    <select value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option value="Estética">Estética</option>
                        <option value="Higiene">Higiene</option>
                        <option value="Médico">Consulta médica</option>
                    </select>
                    <label>Ícono (emoji)</label>
                    <input placeholder="🛁 ✂️ 🐾 💉" value={form.icon}
                        onChange={e => setForm({ ...form, icon: e.target.value })} />
                    <label>Descripción</label>
                    <input placeholder="Descripción breve" value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        style={{ gridColumn: '1 / -1' }} />
                </div>

                {/* Tabla de precios por rango de peso */}
                <div className="ds-price-table-label">
                    💲 Precios por tamaño
                </div>
                <div className="ds-price-table">
                    {WEIGHT_RANGES.map(range => {
                        const field = PRICE_FIELD[range.key];
                        return (
                            <div key={range.key} className="ds-price-table-row">
                                <div className="ds-price-table-info">
                                    <span className="ds-price-range-name">{range.label}</span>
                                    <span className="ds-price-range-desc">{range.desc}</span>
                                </div>
                                <div className="ds-price-input-wrap">
                                    <span className="ds-price-prefix">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={form[field] ?? ''}
                                        onChange={e => setForm({ ...form, [field]: e.target.value })}
                                        required
                                        className="ds-price-input"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="ds-form-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar servicio')}
                    </button>
                </div>
            </form>
        </DSModal>
    );
};

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
export const ProductCard = ({ product, onEdit, onDelete }) => {
    const isLow  = Number(product.stock) < 5 && Number(product.stock) > 0;
    const isOut  = Number(product.stock) === 0;
    return (
        <div className={`ds-card ds-product-card ${isOut ? 'ds-card--out' : isLow ? 'ds-card--low' : ''}`}>
            <div className="ds-product-icon">📦</div>
            <div className="ds-card-body">
                <div className="ds-card-name">{product.name}</div>
                <div className="ds-card-meta">
                    <span className="ds-tag ds-tag--blue">{product.category}</span>
                    <span className="ds-tag ds-tag--green">${product.price}</span>
                </div>
                <div className="ds-product-stock">
                    <span className={`ds-stock-badge ${isOut ? 'out' : isLow ? 'low' : 'ok'}`}>
                        {isOut ? '❌ Agotado' : isLow ? `⚠️ ${product.stock} unid.` : `✓ ${product.stock} unid.`}
                    </span>
                </div>
                {product.description && <div className="ds-card-notes">{product.description}</div>}
            </div>
            <div className="ds-card-actions">
                <button className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(product)}><FaEdit /></button>
                <button className="ds-btn-icon ds-btn-icon--del"  onClick={() => onDelete(product.id, product.name)}><FaTrash /></button>
            </div>
        </div>
    );
};

// ─── PRODUCT FORM MODAL ───────────────────────────────────────────────────────
export const ProductFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState(initial || {
        name: '', price: '', stock: '', category: 'Alimentos', description: ''
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    return (
        <DSModal title={isEdit ? `✏️ Editar — ${initial.name}` : '📦 Nuevo producto'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre</label>
                    <input placeholder="Nombre del producto" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <label>Precio</label>
                    <input type="number" placeholder="$" value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })} required />
                    <label>Stock</label>
                    <input type="number" placeholder="Unidades" value={form.stock}
                        onChange={e => setForm({ ...form, stock: e.target.value })} required />
                    <label>Categoría</label>
                    <select value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option value="Alimentos">Alimentos</option>
                        <option value="Farmacia">Farmacia</option>
                        <option value="Accesorios">Accesorios</option>
                        <option value="Higiene">Higiene</option>
                    </select>
                    <label>Descripción</label>
                    <input placeholder="Descripción breve" value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        style={{ gridColumn: '1 / -1' }} />
                </div>
                <div className="ds-form-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar producto')}
                    </button>
                </div>
            </form>
        </DSModal>
    );
};

// ─── USER CARD ────────────────────────────────────────────────────────────────
export const UserCard = ({ user, onEdit, onDelete, currentUserId }) => (
    <div className="ds-card ds-user-card">
        <div className="ds-card-avatar" style={{
            background: user.role === 'administrador' ? '#fee2e2' : '#e0f2fe',
            color: user.role === 'administrador' ? '#b91c1c' : '#0369a1'
        }}>
            {user.name?.[0]?.toUpperCase()}
        </div>
        <div className="ds-card-body">
            <div className="ds-card-name">{user.name}</div>
            <div className="ds-card-meta">
                <span className={`ds-tag ${user.role === 'administrador' ? 'ds-tag--red' : 'ds-tag--blue'}`}>
                    {user.role === 'administrador' ? '🛡️ Admin' : '👷 Empleado'}
                </span>
                {user.capacity && <span className="ds-tag ds-tag--gray">⚡ Cap. {user.capacity}</span>}
            </div>
            <div className="ds-card-notes">{user.email}</div>
        </div>
        <div className="ds-card-actions">
            <button className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(user)}><FaEdit /></button>
            {user.id !== currentUserId && (
                <button className="ds-btn-icon ds-btn-icon--del" onClick={() => onDelete(user.id, user.name)}><FaTrash /></button>
            )}
        </div>
    </div>
);

// ─── USER FORM MODAL ──────────────────────────────────────────────────────────
export const UserFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState(initial || {
        name: '', email: '', password: '', role: 'empleado', capacity: 1
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    return (
        <DSModal title={isEdit ? `✏️ Editar — ${initial.name}` : '👤 Nuevo usuario'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre</label>
                    <input placeholder="Nombre completo" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <label>Correo</label>
                    <input type="email" placeholder="correo@ejemplo.com" value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })} required />
                    <label>Contraseña</label>
                    <input type="password"
                        placeholder={isEdit ? 'Vacío = no cambiar' : 'Contraseña'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        required={!isEdit} />
                    <label>Rol</label>
                    <select value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option value="empleado">Empleado</option>
                        <option value="administrador">Administrador</option>
                    </select>
                    {form.role === 'empleado' && <>
                        <label>Capacidad</label>
                        <input type="number" min="1" max="5" placeholder="Citas simultáneas" value={form.capacity}
                            onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
                    </>}
                </div>
                <div className="ds-form-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear usuario')}
                    </button>
                </div>
            </form>
        </DSModal>
    );
};