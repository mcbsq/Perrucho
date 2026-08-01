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
import { formatMexPhone } from '../../utils/formatPhone';
import BreedCombobox from '../BreedCombobox/BreedCombobox';
import { STATUS_COLORS, STATUS_EMOJI } from '../../utils/apptStatus';
import { WEIGHT_RANGES, PRICE_FIELD } from '../../utils/pricingRules';
import { readImageAsResizedDataUrl } from '../../utils/imageUpload';
import { STOCK_IMAGE_CATEGORIES } from '../../data/stockImages';

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
export const PetCard = ({ pet, owner, onEdit, onDelete, onToggleStatus }) => {
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
                {owner && <div className="ds-card-owner">👤 {owner.name}</div>}
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
    const [form, setForm] = useState({
        petName: '', species: 'perro', breed: '', weight: '', ownerId: '', notes: '', history: [], status: 'activo',
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
export const ServiceCard = ({ service, onEdit, onDelete }) => (
    <div className="ds-card ds-service-card">
        {service.imageUrl
            ? <img src={service.imageUrl} alt="" className="ds-service-photo" />
            : <div className="ds-service-icon">{service.icon || '✂️'}</div>
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
export const ServiceFormModal = ({ initial, onSave, onClose }) => {
    const [form, setForm] = useState({
        title: '', category: 'Estética', description: '', icon: '', color: 'blue', popular: false,
        priceMini: '', priceChico: '', priceMediano: '', priceGrande: '', priceExtra: '', priceJumbo: '',
        price: '', showOnHome: true, pricingMode: 'weight', customPriceOptions: [],
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
                    <label>Ícono (emoji)</label>
                    <input placeholder="🛁 ✂️ 🐾 💉" value={form.icon}
                        onChange={e => setForm({ ...form, icon: e.target.value })} />
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
                    <label>Criterio de cobro</label>
                    <select value={pricingMode}
                        onChange={e => setForm({ ...form, pricingMode: e.target.value })}>
                        <option value="weight">Por tamaño / peso de mascota</option>
                        <option value="custom">Personalizado (ej. tipo de trabajo)</option>
                    </select>
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

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
export const ProductCard = ({ product, onEdit, onDelete }) => {
    const isLow  = Number(product.stock) < 5 && Number(product.stock) > 0;
    const isOut  = Number(product.stock) === 0;
    const variants = product.variants || [];
    return (
        <div className={`ds-card ds-product-card ${isOut ? 'ds-card--out' : isLow ? 'ds-card--low' : ''}`}>
            {product.imageUrl
                ? <img src={product.imageUrl} alt="" className="ds-service-photo" />
                : <div className="ds-product-icon">📦</div>
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
                    <input type="number" placeholder="Unidades" value={form.stock}
                        onChange={e => setForm({ ...form, stock: e.target.value })} required />
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

// ─── PERSONALIZACIÓN DEL SITIO (branding, cómo funciona, footer, giro) ────────
export const PersonalizacionSection = ({ settings, onSave }) => {
    const [form, setForm] = useState(settings || {});
    const [saving, setSaving] = useState(false);
    const [logoError, setLogoError] = useState('');
    const [stepImageErrors, setStepImageErrors] = useState({});

    useEffect(() => { if (settings) setForm(settings); }, [settings]);

    const steps = form.howItWorksSteps || [];
    const stats = form.stats || [];
    const whyUsFeatures = form.whyUsFeatures || [];
    const footerLinks = form.footerLinks || [];
    const extraFields = form.clientExtraFields || [];

    const set = (patch) => setForm(prev => ({ ...prev, ...patch }));

    const updateStep = (i, field, value) => {
        set({ howItWorksSteps: steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s) });
    };
    const addStep = () => set({ howItWorksSteps: [...steps, { icon: '🐾', imageUrl: null, title: '', description: '' }] });
    const removeStep = (i) => set({ howItWorksSteps: steps.filter((_, idx) => idx !== i) });

    const handleStepImageFile = async (i, e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setStepImageErrors(prev => ({ ...prev, [i]: '' }));
        try {
            const dataUrl = await readImageAsResizedDataUrl(file, { maxDim: 360 });
            updateStep(i, 'imageUrl', dataUrl);
        } catch (err) {
            setStepImageErrors(prev => ({ ...prev, [i]: err.message }));
        }
    };

    const updateStat = (i, field, value) => {
        set({ stats: stats.map((s, idx) => idx === i ? { ...s, [field]: value } : s) });
    };
    const addStat = () => set({ stats: [...stats, { icon: '⭐', value: '', label: '' }] });
    const removeStat = (i) => set({ stats: stats.filter((_, idx) => idx !== i) });

    const updateWhyUsFeature = (i, field, value) => {
        set({ whyUsFeatures: whyUsFeatures.map((f, idx) => idx === i ? { ...f, [field]: value } : f) });
    };
    const addWhyUsFeature = () => set({ whyUsFeatures: [...whyUsFeatures, { icon: '🐾', title: '', desc: '' }] });
    const removeWhyUsFeature = (i) => set({ whyUsFeatures: whyUsFeatures.filter((_, idx) => idx !== i) });

    const updateFooterLink = (i, field, value) => {
        set({ footerLinks: footerLinks.map((l, idx) => idx === i ? { ...l, [field]: value } : l) });
    };
    const addFooterLink = () => set({ footerLinks: [...footerLinks, { label: '', url: '' }] });
    const removeFooterLink = (i) => set({ footerLinks: footerLinks.filter((_, idx) => idx !== i) });

    const updateExtraField = (i, field, value) => {
        set({ clientExtraFields: extraFields.map((f, idx) => idx === i ? { ...f, [field]: value } : f) });
    };
    const addExtraField = () => set({ clientExtraFields: [...extraFields, { key: '', label: '', required: false }] });
    const removeExtraField = (i) => set({ clientExtraFields: extraFields.filter((_, idx) => idx !== i) });

    // ── Logo: se sube como archivo (no URL) y se guarda embebido como
    // data URL en Settings.logoUrl. Se reescala en el navegador antes de
    // codificar para no inflar la base de datos con imágenes gigantes.
    const handleLogoFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setLogoError('');
        try {
            const dataUrl = await readImageAsResizedDataUrl(file, { maxDim: 480 });
            set({ logoUrl: dataUrl });
        } catch (err) {
            setLogoError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onSave(form); }
        finally { setSaving(false); }
    };

    if (!settings) return <p className="empty-td">Cargando configuración...</p>;

    return (
        <form onSubmit={handleSubmit} className="ds-form ds-personalizacion">
            <section className="ds-settings-block">
                <h3>🎨 Marca</h3>
                <div className="ds-form-grid">
                    <label>Nombre del negocio</label>
                    <input value={form.businessName || ''} onChange={e => set({ businessName: e.target.value })} />
                    <label>Slogan</label>
                    <input value={form.slogan || ''} onChange={e => set({ slogan: e.target.value })} />
                    <label>Frase corta (sobre el título)</label>
                    <input placeholder="Ej. Grooming · Tienda · Guardería · Paseos" value={form.heroTagline || ''} onChange={e => set({ heroTagline: e.target.value })} />
                    <label>Subtítulo (bajo el título)</label>
                    <input placeholder="Ej. Baño, corte, arreglo de uñas y más." value={form.heroSubtitle || ''} onChange={e => set({ heroSubtitle: e.target.value })} />
                    <label>Logo</label>
                    <div className="ds-logo-upload">
                        {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="ds-logo-preview" />}
                        <div className="ds-logo-upload-actions">
                            <label className="ds-btn ds-btn--secondary ds-file-btn">
                                {form.logoUrl ? 'Cambiar imagen' : 'Subir imagen'}
                                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFile} hidden />
                            </label>
                            {form.logoUrl && (
                                <button type="button" className="ds-btn ds-btn--secondary" onClick={() => set({ logoUrl: null })}>
                                    Quitar
                                </button>
                            )}
                        </div>
                        {logoError && <p className="ds-logo-error">{logoError}</p>}
                    </div>
                    <label>Color principal</label>
                    <input type="color" value={form.primaryColor || '#4f46e5'} onChange={e => set({ primaryColor: e.target.value })} style={{ width: 60, padding: 2 }} />
                    <label>Color secundario</label>
                    <input type="color" value={form.secondaryColor || '#a29bfe'} onChange={e => set({ secondaryColor: e.target.value })} style={{ width: 60, padding: 2 }} />
                    <label>Tipografía</label>
                    <select value={form.fontFamily || 'system'} onChange={e => set({ fontFamily: e.target.value })}>
                        <option value="system">Predeterminada (sistema)</option>
                        <option value="rounded">Redondeada</option>
                        <option value="serif">Serif (clásica)</option>
                        <option value="mono">Monoespaciada</option>
                    </select>
                </div>
            </section>

            <section className="ds-settings-block">
                <h3>🖼️ Imágenes del sitio</h3>
                <div className="ds-form-grid">
                    <label>Portada de inicio</label>
                    <div>
                        <ImagePicker value={form.heroImageUrl} onChange={url => set({ heroImageUrl: url })} maxDim={1600} />
                        <p className="ds-gallery-hint" style={{ marginTop: 6 }}>Si no eliges una imagen, se sigue mostrando el video por defecto.</p>
                    </div>
                    <label>Fondo de inicio de sesión</label>
                    <ImagePicker value={form.loginBackgroundUrl} onChange={url => set({ loginBackgroundUrl: url })} maxDim={1600} />
                </div>
            </section>

            <section className="ds-settings-block">
                <h3>📱 Contacto y redes</h3>
                <div className="ds-form-grid">
                    <label>WhatsApp</label>
                    <input value={form.whatsappNumber || ''} onChange={e => set({ whatsappNumber: e.target.value })} />
                    <label>Dirección</label>
                    <input value={form.businessAddress || ''} onChange={e => set({ businessAddress: e.target.value })} />
                    <label>Instagram</label>
                    <input value={form.instagramUrl || ''} onChange={e => set({ instagramUrl: e.target.value })} />
                    <label>Facebook</label>
                    <input value={form.facebookUrl || ''} onChange={e => set({ facebookUrl: e.target.value })} />
                    <label>TikTok</label>
                    <input value={form.tiktokUrl || ''} onChange={e => set({ tiktokUrl: e.target.value })} />
                </div>
            </section>

            <section className="ds-settings-block">
                <h3>✨ ¿Cómo funciona?</h3>
                <div className="ds-price-table">
                    {steps.map((s, i) => (
                        <div key={i} className="ds-step-row ds-step-row--wrap">
                            <div className="ds-step-image-upload">
                                {s.imageUrl
                                    ? <img src={s.imageUrl} alt="" className="ds-step-image-preview" />
                                    : <input placeholder="Emoji" value={s.icon || ''} onChange={e => updateStep(i, 'icon', e.target.value)} className="ds-step-emoji-input" />
                                }
                                <label className="ds-btn ds-btn--secondary ds-file-btn ds-file-btn--sm">
                                    {s.imageUrl ? 'Cambiar' : 'Imagen'}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleStepImageFile(i, e)} hidden />
                                </label>
                                {s.imageUrl && (
                                    <button type="button" className="ds-btn ds-btn--secondary ds-file-btn ds-file-btn--sm" onClick={() => updateStep(i, 'imageUrl', null)}>
                                        Quitar
                                    </button>
                                )}
                            </div>
                            <div className="ds-step-text-inputs">
                                <input placeholder="Título del paso" value={s.title} onChange={e => updateStep(i, 'title', e.target.value)} />
                                <input placeholder="Descripción" value={s.description} onChange={e => updateStep(i, 'description', e.target.value)} />
                                {stepImageErrors[i] && <p className="ds-logo-error">{stepImageErrors[i]}</p>}
                            </div>
                            <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => removeStep(i)}><FaTimes /></button>
                        </div>
                    ))}
                </div>
                <button type="button" className="ds-btn ds-btn--secondary" onClick={addStep}>+ Agregar paso</button>
            </section>

            <section className="ds-settings-block">
                <h3>⭐ ¿Por qué elegirnos?</h3>
                <div className="ds-form-grid">
                    <label>Título</label>
                    <input value={form.whyUsTitle || ''} onChange={e => set({ whyUsTitle: e.target.value })} />
                    <label>Subtítulo</label>
                    <input value={form.whyUsSubtitle || ''} onChange={e => set({ whyUsSubtitle: e.target.value })}
                        style={{ gridColumn: '1 / -1' }} />
                </div>
                <div className="ds-price-table" style={{ marginTop: 12 }}>
                    {whyUsFeatures.map((f, i) => (
                        <div key={i} className="ds-step-row">
                            <input placeholder="Emoji" value={f.icon || ''} onChange={e => updateWhyUsFeature(i, 'icon', e.target.value)} style={{ width: 56 }} />
                            <input placeholder="Título" value={f.title || ''} onChange={e => updateWhyUsFeature(i, 'title', e.target.value)} />
                            <input placeholder="Descripción" value={f.desc || ''} onChange={e => updateWhyUsFeature(i, 'desc', e.target.value)} style={{ flex: 2 }} />
                            <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => removeWhyUsFeature(i)}><FaTimes /></button>
                        </div>
                    ))}
                    {whyUsFeatures.length === 0 && <p className="empty-td">Sin características — agrega las que quieras destacar.</p>}
                </div>
                <button type="button" className="ds-btn ds-btn--secondary" onClick={addWhyUsFeature}>+ Agregar característica</button>
            </section>

            <section className="ds-settings-block">
                <h3>🏆 Logros</h3>
                <div className="ds-price-table">
                    {stats.map((s, i) => (
                        <div key={i} className="ds-step-row">
                            <input placeholder="Emoji" value={s.icon || ''} onChange={e => updateStat(i, 'icon', e.target.value)} style={{ width: 56 }} />
                            <input placeholder="Valor (ej. 4000+)" value={s.value || ''} onChange={e => updateStat(i, 'value', e.target.value)} />
                            <input placeholder="Etiqueta (ej. CLIENTES FELICES)" value={s.label || ''} onChange={e => updateStat(i, 'label', e.target.value)} style={{ flex: 2 }} />
                            <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => removeStat(i)}><FaTimes /></button>
                        </div>
                    ))}
                    {stats.length === 0 && <p className="empty-td">Sin logros — agrega los que quieras destacar.</p>}
                </div>
                <button type="button" className="ds-btn ds-btn--secondary" onClick={addStat}>+ Agregar logro</button>
            </section>

            <section className="ds-settings-block">
                <h3>🔗 Pie de página</h3>
                <div className="ds-price-table">
                    {footerLinks.map((l, i) => (
                        <div key={i} className="ds-step-row">
                            <input placeholder="Etiqueta" value={l.label} onChange={e => updateFooterLink(i, 'label', e.target.value)} />
                            <input placeholder="https://... o /ruta" value={l.url} onChange={e => updateFooterLink(i, 'url', e.target.value)} style={{ flex: 2 }} />
                            <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => removeFooterLink(i)}><FaTimes /></button>
                        </div>
                    ))}
                </div>
                <button type="button" className="ds-btn ds-btn--secondary" onClick={addFooterLink}>+ Agregar link</button>
            </section>

            <section className="ds-settings-block">
                <h3>🏷️ Giro de negocio</h3>
                <label className="ds-toggle-inline">
                    <input type="checkbox" checked={form.enablePets !== false} onChange={e => set({ enablePets: e.target.checked })} />
                    <span>Este negocio maneja mascotas (muestra la sección "Pacientes")</span>
                </label>

                <div className="ds-price-table-label" style={{ marginTop: 12 }}>Campos extra al registrar un cliente</div>
                <div className="ds-price-table">
                    {extraFields.map((f, i) => (
                        <div key={i} className="ds-step-row">
                            <input placeholder="clave (sin espacios)" value={f.key} onChange={e => updateExtraField(i, 'key', e.target.value)} />
                            <input placeholder="Etiqueta visible" value={f.label} onChange={e => updateExtraField(i, 'label', e.target.value)} />
                            <label className="ds-toggle-inline" style={{ whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={!!f.required} onChange={e => updateExtraField(i, 'required', e.target.checked)} />
                                <span>Requerido</span>
                            </label>
                            <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => removeExtraField(i)}><FaTimes /></button>
                        </div>
                    ))}
                </div>
                <button type="button" className="ds-btn ds-btn--secondary" onClick={addExtraField}>+ Agregar campo</button>
            </section>

            <div className="ds-form-actions">
                <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </form>
    );
};