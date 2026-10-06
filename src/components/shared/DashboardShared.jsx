// src/components/shared/DashboardShared.jsx
// CAMBIOS v3:
// - PetCard y PetFormModal ahora manejan status (activo/inactivo)
// - El registro de una mascota ya NO implica automáticamente que esté "activa" con tratamiento;
//   es solo un estado administrativo que el staff puede alternar.
// CAMBIOS v2 (catálogo real):
// - ServiceCard y ServiceFormModal con los 6 rangos de peso (Mini→Jumbo)

import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes, FaEdit, FaTrash, FaUser, FaPaw, FaCut, FaBoxOpen,
    FaUserCog, FaPhone, FaEnvelope, FaWeight, FaDog, FaCat,
    FaFeather, FaPlus, FaExclamationTriangle, FaCheckCircle,
    FaClock, FaTag, FaLayerGroup
} from 'react-icons/fa';
import { getServiceIcon } from '../../utils/serviceIcons';
import { formatMexPhone } from '../../utils/formatPhone';
import BreedCombobox from '../BreedCombobox/BreedCombobox';
import { STATUS_COLORS, STATUS_EMOJI } from '../../utils/apptStatus';
import { WEIGHT_RANGES, PRICE_FIELD } from '../../utils/pricingRules';
import { readImageAsResizedDataUrl } from '../../utils/imageUpload';
import { STOCK_IMAGE_CATEGORIES } from '../../data/stockImages';
import { OwnerPicker, PetChipsInline, OwnerChipsInline } from './RelationViews';
import { getPetOwnerIds } from '../../utils/petOwners';

// Índice = Date.getDay() (0=domingo...6=sábado) — mismo orden que
// Settings.businessHours en el backend.
export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ─── Orden de listas (Clientes / Pacientes / Servicios / Inventario / Usuarios) ─
// Petición del cliente: poder ordenar por "últimos registrados" (asc/desc) y
// alfabético en todas las pantallas de catálogo. Ninguno de los modelos trae
// createdAt en todos lados (Service/Product no lo tienen), pero el id
// autoincremental ya refleja el orden de alta sin necesitar una migración —
// se usa como proxy de "más reciente" de forma uniforme en las 5 pantallas.
export const SORT_OPTIONS = [
    { value: '',            label: 'Orden por defecto' },
    { value: 'recent_desc', label: 'Más recientes primero' },
    { value: 'recent_asc',  label: 'Más antiguos primero' },
    { value: 'alpha_asc',   label: 'A → Z' },
    { value: 'alpha_desc',  label: 'Z → A' },
];

export const sortList = (list, mode, nameKey) => {
    if (!mode) return list;
    const sorted = [...list];
    switch (mode) {
        case 'recent_desc': sorted.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)); break;
        case 'recent_asc':  sorted.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)); break;
        case 'alpha_asc':   sorted.sort((a, b) => String(a[nameKey] || '').localeCompare(String(b[nameKey] || ''), 'es')); break;
        case 'alpha_desc':  sorted.sort((a, b) => String(b[nameKey] || '').localeCompare(String(a[nameKey] || ''), 'es')); break;
        default: break;
    }
    return sorted;
};

export const SortSelect = ({ value, onChange }) => (
    <select className="ds-sort-select" value={value} onChange={e => onChange(e.target.value)} title="Ordenar">
        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);

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

// ─── IMAGE PICKER (subir archivo o elegir de la galería de stock) ─────────────
// Reutilizable en cualquier lugar del sistema que necesite una imagen:
// hero del sitio, fondo de login, servicios, productos, etc.
export const ImagePicker = ({ value, onChange, maxDim = 800 }) => {
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError('');
        try {
            const dataUrl = await readImageAsResizedDataUrl(file, { maxDim });
            onChange(dataUrl);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="ds-image-picker">
            {value && <img src={value} alt="" className="ds-image-picker-preview" />}
            <div className="ds-logo-upload-actions">
                <label className="ds-btn ds-btn--secondary ds-file-btn">
                    Subir imagen
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} hidden />
                </label>
                <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setGalleryOpen(true)}>
                    Elegir de galería
                </button>
                {value && (
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => onChange(null)}>
                        Quitar
                    </button>
                )}
            </div>
            {error && <p className="ds-logo-error">{error}</p>}

            {galleryOpen && (
                <DSModal title="📷 Galería de imágenes" onClose={() => setGalleryOpen(false)} wide>
                    <p className="ds-gallery-hint">
                        Fotos de stock (Unsplash) organizadas por giro de negocio — úsalas mientras no tengas tus propias fotos.
                    </p>
                    {STOCK_IMAGE_CATEGORIES.map(cat => (
                        <div key={cat.key} className="ds-gallery-category">
                            <h4>{cat.label}</h4>
                            <div className="ds-gallery-grid">
                                {cat.images.map((url, i) => (
                                    <button type="button" key={i} className="ds-gallery-item"
                                        onClick={() => { onChange(url); setGalleryOpen(false); }}>
                                        <img src={url} alt="" loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </DSModal>
            )}
        </div>
    );
};

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
// `pets` (opcional): las mascotas ligadas a este cliente, propias o
// compartidas — se muestran por nombre para ver de un vistazo de quién es
// cada paciente. Sin `pets` cae al contador de siempre.
export const ClientCard = ({ client, petsCount = 0, pets, onEdit, onDelete, onOpenPet, onAddPet }) => (
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
            {pets ? (
                <div className="rv-card-rel">
                    <span className="rv-card-rel-label">Mascotas</span>
                    <PetChipsInline pets={pets} onOpenPet={onOpenPet} />
                </div>
            ) : pets === null ? null : (
                <div className="ds-card-tags">
                    <span className="ds-tag ds-tag--blue"><FaPaw/> {petsCount} mascota{petsCount !== 1 ? 's' : ''}</span>
                </div>
            )}
        </div>
        <div className="ds-card-actions">
            <button className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(client)} aria-label={`Editar a ${client.name}`}><FaEdit /></button>
            {onAddPet && <button className="ds-btn-icon ds-btn-icon--add" onClick={() => onAddPet(client)} aria-label={`Registrar mascota de ${client.name}`} title="Registrar mascota"><FaPaw /></button>}
            {onDelete && <button className="ds-btn-icon ds-btn-icon--del"  onClick={() => onDelete(client.id, client.name)} aria-label={`Eliminar a ${client.name}`}><FaTrash /></button>}
        </div>
    </div>
);

// ─── CLIENT FORM MODAL ────────────────────────────────────────────────────────
export const ClientFormModal = ({ initial, onSave, onClose, extraFields = [] }) => {
    // { ...defaults, ...initial } y no "initial || defaults": el FAB abre estos
    // modales con setXModal({}) para "nuevo registro", y {} es truthy en JS —
    // "initial || defaults" nunca aplicaba los valores por defecto, dejando
    // ausentes del payload los campos que el usuario no tocara a mano
    // (causaba "Error del servidor" en creates con campos requeridos por Prisma).
    const [form, setForm] = useState({ name: '', phone: '', email: '', extraData: {}, ...initial });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;
    const extraData = form.extraData || {};

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
                    {isEdit && <>
                        <label>Restablecer contraseña</label>
                        <input type="password" placeholder="Vacío = no cambiar" value={form.password || ''}
                            onChange={e => setForm({ ...form, password: e.target.value })} />
                    </>}
                    {/* Campos extra configurados en Personalización → Giro de negocio */}
                    {extraFields.map(f => (
                        <React.Fragment key={f.key}>
                            <label>{f.label}</label>
                            <input value={extraData[f.key] || ''} required={!!f.required}
                                onChange={e => setForm({ ...form, extraData: { ...extraData, [f.key]: e.target.value } })} />
                        </React.Fragment>
                    ))}
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
// CAMBIO v3: muestra y permite alternar status (activo/inactivo)
// `owners` (opcional): todos los dueños de la mascota, principal primero.
// Sin `owners` cae al dueño único de siempre (`owner`).
export const PetCard = ({ pet, owner, owners, onEdit, onDelete, onToggleStatus, onOpenClient }) => {
    const h = hueFromId(pet.id);
    const emoji = speciesEmoji(pet.species);
    const isActive = (pet.status || 'activo') === 'activo';
    return (
        <div className={`ds-card ds-pet-card ${!isActive ? 'ds-card--inactive' : ''}`}>
            <div className="ds-pet-avatar" style={{ background: `hsl(${h},65%,60%)`, opacity: isActive ? 1 : 0.55 }}>
                <span className="ds-pet-initial">{pet.petName?.[0]?.toUpperCase()}</span>
                <span className="ds-pet-emoji-badge">{emoji}</span>
            </div>
            <div className="ds-card-body">
                <div className="ds-card-name">
                    {pet.petName}
                    {!isActive && <span className="ds-pet-inactive-label">Inactivo</span>}
                </div>
                <div className="ds-card-meta">
                    <span className="ds-tag ds-tag--purple">{emoji} {pet.species || 'mascota'}</span>
                    {pet.breed  && <span className="ds-tag ds-tag--gray">{pet.breed}</span>}
                    {pet.weight && <span className="ds-tag ds-tag--gray"><FaWeight/> ~{pet.weight} kg</span>}
                </div>
                {owners ? (
                    <div className="rv-card-rel">
                        <span className="rv-card-rel-label">{owners.length > 1 ? 'Dueños' : 'Dueño'}</span>
                        <OwnerChipsInline owners={owners} onOpenClient={onOpenClient} />
                    </div>
                ) : owner && <div className="ds-card-owner">👤 {owner.name}</div>}
                {pet.notes && <div className="ds-card-notes">📌 {pet.notes}</div>}
            </div>
            <div className="ds-card-actions">
                {onToggleStatus && (
                    <button
                        className={`ds-btn-icon ${isActive ? 'ds-btn-icon--active' : 'ds-btn-icon--inactive'}`}
                        title={isActive ? 'Marcar inactivo' : 'Marcar activo'}
                        onClick={() => onToggleStatus(pet, isActive ? 'inactivo' : 'activo')}>
                        {isActive ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    </button>
                )}
                <button className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(pet)}><FaEdit /></button>
                <button className="ds-btn-icon ds-btn-icon--del"  onClick={() => onDelete(pet.id, pet.petName)}><FaTrash /></button>
            </div>
        </div>
    );
};

// ─── PET FORM MODAL ───────────────────────────────────────────────────────────
// CAMBIO v3: incluye selector de status
export const PetFormModal = ({ initial, clients, onSave, onClose }) => {
    const [form, setForm] = useState(() => {
        const base = {
            petName: '', species: 'perro', breed: '', weight: '', notes: '', history: [], status: 'activo',
            ...initial,
        };
        // Columnas opcionales llegan como null desde el API; un <input> con
        // value={null} se vuelve no controlado (aviso de React).
        ['breed', 'weight', 'notes'].forEach(k => { if (base[k] == null) base[k] = ''; });
        // Una mascota siempre está ligada al menos a un cliente; puede tener
        // varios (ver PetOwner). El primero de ownerIds es el principal.
        return { ...base, ownerIds: getPetOwnerIds(base) };
    });
    const [saving, setSaving] = useState(false);
    const [ownerError, setOwnerError] = useState('');
    const isEdit = !!initial?.id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.ownerIds.length) {
            setOwnerError('Liga la mascota al menos a un cliente.');
            return;
        }
        setSaving(true);
        try {
            const ownerIds = form.ownerIds.map(Number);
            await onSave({ ...form, ownerIds, ownerId: ownerIds[0] });
        }
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
                    <label className="ds-form-label-top">Dueños</label>
                    <div className="ds-form-field">
                        <OwnerPicker clients={clients} value={form.ownerIds} invalid={!!ownerError}
                            onChange={ids => { setForm({ ...form, ownerIds: ids }); if (ids.length) setOwnerError(''); }} />
                        {ownerError
                            ? <p className="ds-field-error" role="alert">{ownerError}</p>
                            : <p className="ds-field-hint">Obligatorio. Puedes ligarla a varios clientes (ej. una familia); la estrella marca al principal.</p>}
                    </div>
                    <label>Notas / alergias</label>
                    <input placeholder="Condiciones especiales, medicamentos..." value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        style={{ gridColumn: '1 / -1' }} />
                    <label>Estado</label>
                    <select value={form.status || 'activo'}
                        onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="activo">✓ Activo</option>
                        <option value="inactivo">○ Inactivo</option>
                    </select>
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
export const ServiceCard = ({ service, onEdit, onDelete }) => {
    const Icon = getServiceIcon(service.title || service.category);
    return (
    <div className="ds-card ds-service-card">
        {service.imageUrl
            ? <img src={service.imageUrl} alt="" className="ds-service-photo" />
            : <div className="ds-service-icon"><Icon /></div>
        }
        <div className="ds-card-body">
            <div className="ds-card-name">{service.title}</div>
            <div className="ds-card-meta">
                <span className="ds-tag ds-tag--blue">{service.category}</span>
            </div>
            <div className="ds-service-prices-grid">
                {service.pricingMode === 'custom'
                    ? (service.customPriceOptions || []).map((opt, i) => (
                        <div key={i} className="ds-service-price-item">
                            <span className="ds-service-price-label">{opt.label}</span>
                            <strong className="ds-service-price-value">${opt.price}</strong>
                        </div>
                    ))
                    : WEIGHT_RANGES.map(range => {
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
};

// ─── CATEGORY FIELD (select + "Otro" con texto libre) ─────────────────────────
// El valor guardado sigue siendo un string plano en `category` (sin cambios de
// esquema) — "Otro" es solo un estado de la UI para decidir si mostrar el
// select o el input de texto libre.
const CategoryField = ({ value, knownOptions, onChange }) => {
    const initiallyCustom = !!value && !knownOptions.includes(value);
    const [customMode, setCustomMode] = useState(initiallyCustom);
    const selectValue = customMode ? '__otro__' : (value || knownOptions[0]);

    return (
        <>
            <select value={selectValue} onChange={e => {
                const v = e.target.value;
                if (v === '__otro__') { setCustomMode(true); onChange(''); }
                else { setCustomMode(false); onChange(v); }
            }}>
                {knownOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                <option value="__otro__">Otro (escribir)</option>
            </select>
            {customMode && (
                <input
                    placeholder="Escribe la categoría"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    style={{ gridColumn: '1 / -1' }}
                    autoFocus
                    required
                />
            )}
        </>
    );
};

// ─── SERVICE FORM MODAL ───────────────────────────────────────────────────────
export const ServiceFormModal = ({ initial, onSave, onClose, settings }) => {
    const [form, setForm] = useState({
        title: '', category: 'Estética', description: '', icon: '', color: 'blue', popular: false,
        priceMini: '', priceChico: '', priceMediano: '', priceGrande: '', priceExtra: '', priceJumbo: '',
        price: '', showOnHome: true, pricingMode: 'weight', customPriceOptions: [], durationMinutes: 45,
        ...initial,
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;
    const pricingMode = form.pricingMode || 'weight';
    const customOptions = form.customPriceOptions || [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...form, price: form.priceMini || form.price };
        try { await onSave(payload); }
        finally { setSaving(false); }
    };

    const updateOption = (i, field, value) => {
        const next = customOptions.map((o, idx) => idx === i ? { ...o, [field]: value } : o);
        setForm({ ...form, customPriceOptions: next });
    };
    const addOption = () => setForm({ ...form, customPriceOptions: [...customOptions, { label: '', price: '' }] });
    const removeOption = (i) => setForm({ ...form, customPriceOptions: customOptions.filter((_, idx) => idx !== i) });

    return (
        <DSModal title={isEdit ? `✏️ Editar — ${initial.title}` : '✂️ Nuevo servicio'} onClose={onClose} wide>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre</label>
                    <input placeholder="Nombre del servicio" value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })} required />
                    <label>Categoría</label>
                    <CategoryField
                        value={form.category}
                        knownOptions={['Estética', 'Higiene', 'Médico']}
                        onChange={category => setForm({ ...form, category })}
                    />
                    <label>Foto</label>
                    <ImagePicker value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} maxDim={700} />
                    <label>Descripción</label>
                    <input placeholder="Descripción breve" value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        style={{ gridColumn: '1 / -1' }} />
                    <label>Visible en inicio</label>
                    <label className="ds-toggle-inline">
                        <input type="checkbox" checked={form.showOnHome !== false}
                            onChange={e => setForm({ ...form, showOnHome: e.target.checked })} />
                        <span>{form.showOnHome !== false ? 'Se muestra en la página principal' : 'Solo visible en Punto de Venta'}</span>
                    </label>
                    {settings?.enableMemberships && (
                        <>
                            <label>Es una clase</label>
                            <label className="ds-toggle-inline">
                                <input type="checkbox" checked={!!form.isClass}
                                    onChange={e => setForm({ ...form, isClass: e.target.checked })} />
                                <span>Sujeta a membresía — se avisa si el cliente no tiene una vigente al reservar</span>
                            </label>
                        </>
                    )}
                    <label>Criterio de cobro</label>
                    <select value={pricingMode}
                        onChange={e => setForm({ ...form, pricingMode: e.target.value })}>
                        <option value="weight">Por tamaño / peso de mascota</option>
                        <option value="custom">Personalizado (ej. tipo de trabajo)</option>
                    </select>
                    <label>Duración de la cita</label>
                    <div className="ds-hours-range">
                        <input type="number" min="5" step="5" value={form.durationMinutes ?? 45}
                            onChange={e => setForm({ ...form, durationMinutes: e.target.value })}
                            style={{ width: 90 }} required />
                        <span>minutos — define cada cuánto se ofrecen horarios para agendar este servicio</span>
                    </div>
                </div>

                {pricingMode === 'weight' ? (
                    <>
                        <div className="ds-price-table-label">💲 Precios por tamaño</div>
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
                    </>
                ) : (
                    <>
                        <div className="ds-price-table-label">💲 Opciones de precio personalizadas</div>
                        <div className="ds-price-table">
                            {customOptions.map((opt, i) => (
                                <div key={i} className="ds-price-table-row">
                                    <input placeholder="Ej: Gelish, Acrílico, Corte de caballero..."
                                        value={opt.label}
                                        onChange={e => updateOption(i, 'label', e.target.value)}
                                        style={{ flex: 1, marginRight: 8 }} required />
                                    <div className="ds-price-input-wrap">
                                        <span className="ds-price-prefix">$</span>
                                        <input type="number" min="0" placeholder="0"
                                            value={opt.price}
                                            onChange={e => updateOption(i, 'price', e.target.value)}
                                            required className="ds-price-input" />
                                    </div>
                                    <button type="button" className="ds-btn-icon ds-btn-icon--del"
                                        onClick={() => removeOption(i)}><FaTimes /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={addOption}>
                            + Agregar opción
                        </button>
                    </>
                )}

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

// ─── MEMBERSHIP PLAN FORM (giro gimnasio) ──────────────────────────────────────
export const MembershipPlanFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState({
        name: '', price: '', durationDays: 30, classesLimit: '',
        ...initial,
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
        <DSModal title={isEdit ? `✏️ Editar — ${initial.name}` : '🏋️ Nuevo plan de membresía'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre</label>
                    <input placeholder="Ej: Mensualidad Ilimitada" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <label>Precio</label>
                    <input type="number" min="0" placeholder="$" value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })} required />
                    <label>Vigencia</label>
                    <div className="ds-hours-range">
                        <input type="number" min="1" value={form.durationDays}
                            onChange={e => setForm({ ...form, durationDays: e.target.value })}
                            style={{ width: 90 }} required />
                        <span>días — cada renovación mueve la vigencia esta cantidad de días desde hoy</span>
                    </div>
                    <label>Clases incluidas</label>
                    <input type="number" min="0" placeholder="Vacío = ilimitado" value={form.classesLimit ?? ''}
                        onChange={e => setForm({ ...form, classesLimit: e.target.value })} />
                </div>
                <div className="ds-form-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar plan')}
                    </button>
                </div>
            </form>
        </DSModal>
    );
};

// ─── NOTA CLÍNICA (giro clínica) ────────────────────────────────────────────
// Se abre justo después de finalizar una cita, si el negocio lleva
// expediente (Settings.enableClientNotes) — opcional, "Omitir" no bloquea
// nada, la cita ya se finalizó y cobró antes de que este modal aparezca.
export const ClinicalNoteModal = ({ clientName, onSave, onClose }) => {
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!note.trim()) return;
        setSaving(true);
        try { await onSave(note.trim()); onClose(); }
        finally { setSaving(false); }
    };

    return (
        <DSModal title={`📋 Nota clínica — ${clientName}`} onClose={onClose}>
            <div className="ds-form">
                <div className="ds-form-grid">
                    <label>Nota de esta consulta</label>
                    <textarea rows={5} placeholder="Diagnóstico, indicaciones, seguimiento..."
                        value={note} onChange={e => setNote(e.target.value)}
                        style={{ padding: 11, borderRadius: 10, border: '1.5px solid var(--ds-border, #e0e4ea)', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                </div>
                <div className="ds-form-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Omitir</button>
                    <button type="button" className="ds-btn ds-btn--primary" disabled={saving || !note.trim()} onClick={handleSave}>
                        {saving ? 'Guardando...' : 'Guardar nota'}
                    </button>
                </div>
            </div>
        </DSModal>
    );
};

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
export const ProductCard = ({ product, onEdit, onDelete }) => {
    const isLow  = Number(product.stock) < 5 && Number(product.stock) > 0;
    const isOut  = Number(product.stock) === 0;
    const variants = product.variants || [];
    const ProdIcon = getServiceIcon(product.category || product.name);
    return (
        <div className={`ds-card ds-product-card ${isOut ? 'ds-card--out' : isLow ? 'ds-card--low' : ''}`}>
            {product.imageUrl
                ? <img src={product.imageUrl} alt="" className="ds-service-photo" />
                : <div className="ds-product-icon"><ProdIcon /></div>
            }
            <div className="ds-card-body">
                <div className="ds-card-name">{product.name}</div>
                <div className="ds-card-meta">
                    <span className="ds-tag ds-tag--blue">{product.category}</span>
                    <span className="ds-tag ds-tag--green">${product.price}</span>
                    {variants.length > 0 && <span className="ds-tag ds-tag--blue">{variants.length} variante{variants.length !== 1 ? 's' : ''}</span>}
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
    const [form, setForm] = useState({
        name: '', price: '', stock: '', category: 'Alimentos', description: '', imageUrl: null, variants: [],
        ...initial,
    });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial?.id;
    const variants = form.variants || [];
    // "Sumar stock" — antes solo se podía sobrescribir el total a mano (fácil
    // de restar mal al recibir una compra nueva). Este campo no se guarda:
    // solo suma su valor al stock actual y se limpia.
    const [addQty, setAddQty] = useState('');
    const [addVariantQty, setAddVariantQty] = useState({});

    const applyAddStock = () => {
        const n = Number(addQty);
        if (!n) return;
        setForm(f => ({ ...f, stock: (Number(f.stock) || 0) + n }));
        setAddQty('');
    };
    const applyAddVariantStock = (i) => {
        const n = Number(addVariantQty[i]);
        if (!n) return;
        setForm(f => ({ ...f, variants: (f.variants || []).map((v, idx) => idx === i ? { ...v, stock: (Number(v.stock) || 0) + n } : v) }));
        setAddVariantQty(prev => ({ ...prev, [i]: '' }));
    };

    const updateVariant = (i, field, value) => {
        setForm({ ...form, variants: variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v) });
    };
    const addVariant = () => setForm({ ...form, variants: [...variants, { name: '', price: '', stock: '' }] });
    const removeVariant = (i) => setForm({ ...form, variants: variants.filter((_, idx) => idx !== i) });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    return (
        <DSModal title={isEdit ? `✏️ Editar — ${initial.name}` : '📦 Nuevo producto'} onClose={onClose} wide>
            <form onSubmit={handleSubmit} className="ds-form">
                <div className="ds-form-grid">
                    <label>Nombre</label>
                    <input placeholder="Nombre del producto" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <label>Foto</label>
                    <ImagePicker value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} maxDim={700} />
                    <label>Precio</label>
                    <input type="number" placeholder="$" value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })} required />
                    <label>Stock</label>
                    <div>
                        <input type="number" placeholder="Unidades" value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })} required />
                        {isEdit && (
                            <div className="ds-hours-range" style={{ marginTop: 8 }}>
                                <input type="number" min="1" placeholder="Cantidad" value={addQty}
                                    onChange={e => setAddQty(e.target.value)} style={{ width: 100 }} />
                                <button type="button" className="ds-btn ds-btn--secondary" onClick={applyAddStock}>
                                    + Sumar al stock actual
                                </button>
                            </div>
                        )}
                    </div>
                    <label>Categoría</label>
                    <CategoryField
                        value={form.category}
                        knownOptions={['Alimentos', 'Farmacia', 'Accesorios', 'Higiene']}
                        onChange={category => setForm({ ...form, category })}
                    />
                    <label>Descripción</label>
                    <input placeholder="Descripción breve" value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        style={{ gridColumn: '1 / -1' }} />
                </div>

                <div className="ds-price-table-label">
                    📐 Variantes (opcional — ej. presentaciones, tallas, colores)
                </div>
                <div className="ds-price-table">
                    {variants.map((v, i) => (
                        <div key={i} className="ds-step-row">
                            <input placeholder="Nombre (ej. 500ml, Talla M...)" value={v.name}
                                onChange={e => updateVariant(i, 'name', e.target.value)} style={{ flex: 2 }} required />
                            <div className="ds-price-input-wrap">
                                <span className="ds-price-prefix">$</span>
                                <input type="number" min="0" placeholder="Precio" value={v.price}
                                    onChange={e => updateVariant(i, 'price', e.target.value)} required className="ds-price-input" />
                            </div>
                            <input type="number" min="0" placeholder="Stock" value={v.stock}
                                onChange={e => updateVariant(i, 'stock', e.target.value)} style={{ width: 90 }} required />
                            {isEdit && (
                                <>
                                    <input type="number" min="1" placeholder="+" value={addVariantQty[i] || ''}
                                        onChange={e => setAddVariantQty(prev => ({ ...prev, [i]: e.target.value }))}
                                        style={{ width: 60 }} title="Cantidad a sumar" />
                                    <button type="button" className="ds-btn-icon" onClick={() => applyAddVariantStock(i)} title="Sumar al stock de esta variante">
                                        <FaPlus />
                                    </button>
                                </>
                            )}
                            <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => removeVariant(i)}><FaTimes /></button>
                        </div>
                    ))}
                    {variants.length === 0 && <p className="empty-td">Sin variantes — se vende como producto único con el precio y stock de arriba.</p>}
                </div>
                <button type="button" className="ds-btn ds-btn--secondary" onClick={addVariant} style={{ marginBottom: 20 }}>
                    + Agregar variante
                </button>

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
// NOTA: solo recibe usuarios con role administrador/empleado — los clientes
// se gestionan en la pestaña Clientes, nunca aquí.
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
// NOTA: el rol aquí solo puede ser empleado/administrador — para registrar
// clientes se usa el flujo público de /acceso (signup).
export const UserFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState({
        name: '', email: '', password: '', role: 'empleado', capacity: 1,
        ...initial,
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

// ─── PERSONALIZACIÓN DEL SITIO ────────────────────────────────────────────────
// Vive en SettingsHub.jsx: tarjetas por módulo (Identidad, Colores, Sucursales,
// Ticket…) que abren su propio pop-up con Cancelar / Guardar.
