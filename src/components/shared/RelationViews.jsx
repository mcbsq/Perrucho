// src/components/shared/RelationViews.jsx
//
// Clientes ↔ pacientes: vista de tarjetas o de lista (con quién está ligado
// cada registro a la vista), y el selector de dueños de una mascota. Una
// mascota puede tener varios dueños (Pet.ownerIds) y siempre al menos uno.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    FaThLarge, FaList, FaEdit, FaTrash, FaPaw, FaUser, FaPhone, FaEnvelope,
    FaStar, FaRegStar, FaTimes, FaSearch, FaPlus, FaCheckCircle, FaExclamationTriangle, FaFolderOpen,
} from 'react-icons/fa';
import { getOwnersOfPet, getPetsOfClient, getPetOwnerIds } from '../../utils/petOwners';
import './RelationViews.css';

// Mismo color por id que el resto de las tarjetas (DashboardShared.hueFromId)
// — definido aquí para no importar DashboardShared, que a su vez usa este archivo.
const hueFromId = (id) => (Number(id) * 137) % 360;

// ─── Preferencia de vista (por pantalla, recordada en este navegador) ────────
export const useViewMode = (key, fallback = 'cards') => {
    const storageKey = `emporio_view_${key}`;
    const [mode, setMode] = useState(() => {
        try { return localStorage.getItem(storageKey) || fallback; } catch { return fallback; }
    });
    const update = (next) => {
        setMode(next);
        try { localStorage.setItem(storageKey, next); } catch { /* modo privado: solo en memoria */ }
    };
    return [mode, update];
};

export const ViewToggle = ({ value, onChange }) => (
    <div className="rv-toggle" role="radiogroup" aria-label="Tipo de vista">
        {[
            { id: 'cards', label: 'Tarjetas', icon: <FaThLarge /> },
            { id: 'list', label: 'Lista', icon: <FaList /> },
        ].map(opt => (
            <button key={opt.id} type="button" role="radio" aria-checked={value === opt.id}
                className={`rv-toggle-btn ${value === opt.id ? 'is-active' : ''}`}
                onClick={() => onChange(opt.id)}>
                {opt.icon}<span>{opt.label}</span>
            </button>
        ))}
    </div>
);

// ─── Chips de relación ────────────────────────────────────────────────────────
const Avatar = ({ id, label, size = 36, round = true }) => (
    <span className="rv-avatar" style={{ width: size, height: size, borderRadius: round ? '50%' : 10, background: `hsl(${hueFromId(id)},55%,62%)` }}>
        {(label || '?')[0]?.toUpperCase()}
    </span>
);

const PetChip = ({ pet, shared, onClick }) => (
    <button type="button" className="rv-chip rv-chip--pet" onClick={onClick} title={shared ? 'Mascota compartida con otro cliente' : undefined}>
        <FaPaw aria-hidden="true" />
        <span>{pet.petName}</span>
        {shared && <span className="rv-chip-flag">compartida</span>}
    </button>
);

const OwnerChip = ({ client, primary, onClick }) => (
    <button type="button" className={`rv-chip rv-chip--owner ${primary ? 'is-primary' : ''}`} onClick={onClick}
        title={primary ? 'Dueño principal' : 'Dueño'}>
        {primary ? <FaStar aria-hidden="true" /> : <FaUser aria-hidden="true" />}
        <span>{client.name}</span>
    </button>
);

const EmptyRow = ({ children }) => <div className="rv-empty">{children}</div>;

// ─── Lista de clientes ───────────────────────────────────────────────────────
export const ClientsList = ({ clients, pets, onEdit, onDelete, onOpenPet, onAddPet, onOpenRecord, showPets = true }) => {
    if (!clients.length) return <EmptyRow>Sin resultados</EmptyRow>;
    return (
        <div className={`rv-table rv-table--clients ${showPets ? '' : 'rv-table--no-rel'}`} role="table" aria-label="Clientes">
            <div className="rv-row rv-row--head" role="row">
                <span role="columnheader">Cliente</span>
                <span role="columnheader">Contacto</span>
                {showPets && <span role="columnheader">Mascotas</span>}
                <span role="columnheader" className="rv-col-actions"><span className="rv-sr">Acciones</span></span>
            </div>
            {clients.map(c => {
                const own = showPets ? getPetsOfClient(pets, c.id) : [];
                return (
                    <div key={c.id} className="rv-row" role="row">
                        <span className="rv-cell rv-cell--main" role="cell">
                            <Avatar id={c.id} label={c.name} />
                            <span className="rv-name">{c.name}</span>
                        </span>
                        <span className="rv-cell rv-cell--contact" role="cell">
                            {c.phone && <span><FaPhone aria-hidden="true" /> {c.phone}</span>}
                            {c.email && <span className="rv-ellipsis"><FaEnvelope aria-hidden="true" /> {c.email}</span>}
                            {!c.phone && !c.email && <span className="rv-muted">Sin contacto</span>}
                        </span>
                        {showPets && <span className="rv-cell rv-cell--rel" role="cell">
                            <span className="rv-cell-label">Mascotas</span>
                            {own.map(p => (
                                <PetChip key={p.id} pet={p} shared={getPetOwnerIds(p).length > 1} onClick={() => onOpenPet?.(p)} />
                            ))}
                            {onAddPet && (
                                <button type="button" className="rv-chip rv-chip--add" onClick={() => onAddPet(c)}>
                                    <FaPlus aria-hidden="true" /> <span>{own.length ? 'Agregar' : 'Registrar mascota'}</span>
                                </button>
                            )}
                        </span>}
                        <span className="rv-cell rv-col-actions" role="cell">
                            {onOpenRecord && <button type="button" className="ds-btn-icon ds-btn-icon--record" onClick={() => onOpenRecord(c)} aria-label={`Expediente de ${c.name}`} title="Expediente"><FaFolderOpen /></button>}
                            <button type="button" className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(c)} aria-label={`Editar a ${c.name}`}><FaEdit /></button>
                            {onDelete && <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => onDelete(c.id, c.name)} aria-label={`Eliminar a ${c.name}`}><FaTrash /></button>}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Lista de pacientes ──────────────────────────────────────────────────────
export const PetsList = ({ pets, clients, onEdit, onDelete, onToggleStatus, onOpenClient, onOpenRecord }) => {
    if (!pets.length) return <EmptyRow>Sin resultados</EmptyRow>;
    return (
        <div className="rv-table rv-table--pets" role="table" aria-label="Pacientes">
            <div className="rv-row rv-row--head" role="row">
                <span role="columnheader">Paciente</span>
                <span role="columnheader">Detalle</span>
                <span role="columnheader">Dueños</span>
                <span role="columnheader" className="rv-col-actions"><span className="rv-sr">Acciones</span></span>
            </div>
            {pets.map(p => {
                const owners = getOwnersOfPet(p, clients);
                const isActive = (p.status || 'activo') === 'activo';
                return (
                    <div key={p.id} className={`rv-row ${isActive ? '' : 'is-inactive'}`} role="row">
                        <span className="rv-cell rv-cell--main" role="cell">
                            <Avatar id={p.id} label={p.petName} round={false} />
                            <span className="rv-name">
                                {p.petName}
                                {!isActive && <span className="rv-status-off">Inactivo</span>}
                            </span>
                        </span>
                        <span className="rv-cell rv-cell--contact" role="cell">
                            <span className="rv-ellipsis">{[p.species && p.species[0].toUpperCase() + p.species.slice(1), p.breed].filter(Boolean).join(' · ') || 'Sin especie'}</span>
                            {p.weight && <span className="rv-muted">~{p.weight} kg</span>}
                        </span>
                        <span className="rv-cell rv-cell--rel" role="cell">
                            <span className="rv-cell-label">Dueños</span>
                            {owners.length
                                ? owners.map((o, i) => <OwnerChip key={o.id} client={o} primary={i === 0} onClick={() => onOpenClient?.(o)} />)
                                : <span className="rv-warn"><FaExclamationTriangle aria-hidden="true" /> Sin dueño</span>}
                        </span>
                        <span className="rv-cell rv-col-actions" role="cell">
                            {onToggleStatus && (
                                <button type="button" className={`ds-btn-icon ${isActive ? 'ds-btn-icon--active' : 'ds-btn-icon--inactive'}`}
                                    onClick={() => onToggleStatus(p, isActive ? 'inactivo' : 'activo')}
                                    aria-label={isActive ? 'Marcar inactivo' : 'Marcar activo'} title={isActive ? 'Marcar inactivo' : 'Marcar activo'}>
                                    {isActive ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                </button>
                            )}
                            {onOpenRecord && <button type="button" className="ds-btn-icon ds-btn-icon--record" onClick={() => onOpenRecord(p)} aria-label={`Expediente de ${p.petName}`} title="Expediente"><FaFolderOpen /></button>}
                            <button type="button" className="ds-btn-icon ds-btn-icon--edit" onClick={() => onEdit(p)} aria-label={`Editar a ${p.petName}`}><FaEdit /></button>
                            {onDelete && <button type="button" className="ds-btn-icon ds-btn-icon--del" onClick={() => onDelete(p.id, p.petName)} aria-label={`Eliminar a ${p.petName}`}><FaTrash /></button>}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// Chips compactos para las tarjetas (ClientCard / PetCard).
export const PetChipsInline = ({ pets, onOpenPet, max = 4 }) => {
    if (!pets.length) return <span className="rv-muted rv-small">Sin mascotas</span>;
    const shown = pets.slice(0, max);
    return (
        <span className="rv-chip-row">
            {shown.map(p => <PetChip key={p.id} pet={p} shared={getPetOwnerIds(p).length > 1} onClick={() => onOpenPet?.(p)} />)}
            {pets.length > max && <span className="rv-chip rv-chip--more">+{pets.length - max}</span>}
        </span>
    );
};

export const OwnerChipsInline = ({ owners, onOpenClient }) => {
    if (!owners.length) return <span className="rv-warn"><FaExclamationTriangle aria-hidden="true" /> Sin dueño</span>;
    return (
        <span className="rv-chip-row">
            {owners.map((o, i) => <OwnerChip key={o.id} client={o} primary={i === 0} onClick={() => onOpenClient?.(o)} />)}
        </span>
    );
};

// ─── Selector de dueños (mascota → 1..n clientes) ────────────────────────────
// El primero de la lista es el dueño principal; la estrella cambia cuál es.
export const OwnerPicker = ({ clients, value, onChange, invalid }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const boxRef = useRef(null);
    const listId = useId();
    const selectedIds = (value || []).map(String);
    const byId = useMemo(() => new Map(clients.map(c => [String(c.id), c])), [clients]);
    const selected = selectedIds.map(id => byId.get(id)).filter(Boolean);

    const options = useMemo(() => {
        const q = query.trim().toLowerCase();
        return [...clients]
            .filter(c => !selectedIds.includes(String(c.id)))
            .filter(c => !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'))
            .slice(0, 8);
    }, [clients, query, selectedIds]);

    useEffect(() => {
        const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    useEffect(() => { setHighlight(0); }, [query]);

    const add = (c) => { onChange([...selectedIds, String(c.id)]); setQuery(''); setOpen(false); };
    const remove = (id) => onChange(selectedIds.filter(x => x !== id));
    const makePrimary = (id) => onChange([id, ...selectedIds.filter(x => x !== id)]);

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(h + 1, options.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
        else if (e.key === 'Enter' && open && options[highlight]) { e.preventDefault(); add(options[highlight]); }
        else if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div className={`rv-owner-picker ${invalid ? 'is-invalid' : ''}`} ref={boxRef}>
            {selected.length > 0 && (
                <ul className="rv-owner-list">
                    {selected.map((c, i) => (
                        <li key={c.id} className={i === 0 ? 'is-primary' : ''}>
                            <button type="button" className="rv-owner-star" onClick={() => makePrimary(String(c.id))}
                                aria-label={i === 0 ? `${c.name} es el dueño principal` : `Hacer a ${c.name} dueño principal`}
                                title={i === 0 ? 'Dueño principal' : 'Hacer principal'} disabled={i === 0}>
                                {i === 0 ? <FaStar /> : <FaRegStar />}
                            </button>
                            <span className="rv-owner-name">{c.name}{i === 0 && <small>Principal</small>}</span>
                            <button type="button" className="rv-owner-remove" onClick={() => remove(String(c.id))} aria-label={`Quitar a ${c.name}`}>
                                <FaTimes />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="rv-owner-search">
                <FaSearch aria-hidden="true" />
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder={selected.length ? 'Agregar otro dueño…' : 'Buscar cliente por nombre o teléfono…'}
                    role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-label="Buscar dueño"
                />
            </div>
            {open && (
                <ul className="rv-owner-options" role="listbox" id={listId}>
                    {options.length === 0 && <li className="rv-owner-empty">{clients.length ? 'Sin coincidencias' : 'Primero registra un cliente'}</li>}
                    {options.map((c, i) => (
                        <li key={c.id} role="option" aria-selected={i === highlight}
                            className={i === highlight ? 'is-highlight' : ''}
                            onMouseEnter={() => setHighlight(i)}
                            onMouseDown={(e) => { e.preventDefault(); add(c); }}>
                            <span className="rv-owner-opt-name">{c.name}</span>
                            {c.phone && <span className="rv-muted">{c.phone}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
