// src/components/Reviews/ReviewsAdmin.jsx
//
// Panel → Reseñas: moderación como en Pastrana Events. Pendientes primero;
// aprobar publica la reseña en la página, rechazar la oculta, y se puede
// corregir (nombre, estrellas, texto, quitar fotos) o eliminar.
import React, { useMemo, useState } from 'react';
import { FaCheck, FaBan, FaEdit, FaTrash, FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import { Stars, PhotoLightbox } from './Reviews';
import './Reviews.css';
import './ReviewsAdmin.css';

const STATUS = {
    PENDING: { label: 'Pendiente', cls: 'pending' },
    APPROVED: { label: 'Publicada', cls: 'approved' },
    REJECTED: { label: 'Rechazada', cls: 'rejected' },
};
const FILTERS = [
    { id: 'PENDING', label: 'Pendientes' },
    { id: 'APPROVED', label: 'Publicadas' },
    { id: 'REJECTED', label: 'Rechazadas' },
    { id: 'ALL', label: 'Todas' },
];
const fmt = (d) => new Date(d).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const ReviewsAdmin = ({ reviews, loading, onUpdate, onDelete }) => {
    const [filter, setFilter] = useState('PENDING');
    const [editing, setEditing] = useState(null); // { id, name, rating, message, photos }
    const [busy, setBusy] = useState(null);
    const [lightbox, setLightbox] = useState(null);

    const counts = useMemo(() => ({
        PENDING: reviews.filter(r => r.status === 'PENDING').length,
        APPROVED: reviews.filter(r => r.status === 'APPROVED').length,
        REJECTED: reviews.filter(r => r.status === 'REJECTED').length,
        ALL: reviews.length,
    }), [reviews]);
    const approved = reviews.filter(r => r.status === 'APPROVED');
    const avg = approved.length ? approved.reduce((a, r) => a + r.rating, 0) / approved.length : 0;
    const list = filter === 'ALL' ? reviews : reviews.filter(r => r.status === filter);

    const act = async (id, patch) => {
        setBusy(id);
        try { await onUpdate(id, patch); if (editing?.id === id) setEditing(null); }
        finally { setBusy(null); }
    };

    return (
        <div className="rva">
            <div className="rva-summary">
                <div><strong>{approved.length ? avg.toFixed(1) : '—'}</strong><Stars value={avg} size={15} /><span>{approved.length} publicada{approved.length === 1 ? '' : 's'}</span></div>
                <p>Las reseñas nuevas llegan como <b>pendientes</b> y solo aparecen en tu página cuando las apruebas.</p>
            </div>
            <div className="rva-filters" role="tablist" aria-label="Filtrar reseñas">
                {FILTERS.map(f => (
                    <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={`rva-filter ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
                        {f.label} <span>{counts[f.id]}</span>
                    </button>
                ))}
            </div>

            {loading ? <div className="rva-empty">Cargando reseñas…</div>
                : list.length === 0 ? <div className="rva-empty">{filter === 'PENDING' ? 'No hay reseñas por revisar.' : 'No hay reseñas en este filtro.'}</div>
                : (
                    <ul className="rva-list">
                        {list.map(r => {
                            const isEditing = editing?.id === r.id;
                            const st = STATUS[r.status] || STATUS.PENDING;
                            return (
                                <li key={r.id} className={`rva-item rva-item--${st.cls}`}>
                                    <div className="rva-item-head">
                                        <span className={`rva-badge rva-badge--${st.cls}`}>{st.label}</span>
                                        <span className="rva-date">{fmt(r.createdAt)}</span>
                                    </div>
                                    {isEditing ? (
                                        <div className="rva-edit">
                                            <div className="rva-edit-stars" role="radiogroup" aria-label="Calificación">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <button key={n} type="button" role="radio" aria-checked={editing.rating === n} aria-label={`${n} estrellas`}
                                                        onClick={() => setEditing(e => ({ ...e, rating: n }))}>
                                                        {n <= editing.rating ? <FaStar /> : <FaRegStar />}
                                                    </button>
                                                ))}
                                            </div>
                                            <input value={editing.name} onChange={e => setEditing(x => ({ ...x, name: e.target.value }))} aria-label="Nombre" />
                                            <textarea rows={3} value={editing.message} onChange={e => setEditing(x => ({ ...x, message: e.target.value }))} aria-label="Comentario" />
                                            {editing.photos.length > 0 && (
                                                <div className="rva-photos">
                                                    {editing.photos.map((p, i) => (
                                                        <span key={i} className="rva-photo">
                                                            <img src={p.url} alt="" />
                                                            <button type="button" onClick={() => setEditing(x => ({ ...x, photos: x.photos.filter((_, j) => j !== i) }))} aria-label="Quitar foto"><FaTimes /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="rva-actions">
                                                <button type="button" className="rva-btn" onClick={() => setEditing(null)}>Cancelar</button>
                                                <button type="button" className="rva-btn rva-btn--primary" disabled={busy === r.id}
                                                    onClick={() => act(r.id, { name: editing.name, rating: editing.rating, message: editing.message, photos: editing.photos })}>Guardar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="rva-item-main">
                                                <Stars value={r.rating} />
                                                <strong>{r.name}</strong>
                                                {r.serviceName && <span className="rva-service">{r.serviceName}</span>}
                                            </div>
                                            <p className="rva-message">{r.message}</p>
                                            {(r.photos || []).length > 0 && (
                                                <div className="rva-photos">
                                                    {r.photos.map((p, i) => (
                                                        <button key={i} type="button" className="rva-photo" onClick={() => setLightbox({ photos: r.photos, start: i, caption: r.name })} aria-label={`Ver foto ${i + 1}`}>
                                                            <img src={p.url} alt="" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="rva-actions">
                                                {r.status !== 'APPROVED' && <button type="button" className="rva-btn rva-btn--approve" disabled={busy === r.id} onClick={() => act(r.id, { status: 'APPROVED' })}><FaCheck aria-hidden="true" /> Aprobar</button>}
                                                {r.status !== 'REJECTED' && <button type="button" className="rva-btn" disabled={busy === r.id} onClick={() => act(r.id, { status: 'REJECTED' })}><FaBan aria-hidden="true" /> {r.status === 'APPROVED' ? 'Ocultar' : 'Rechazar'}</button>}
                                                <button type="button" className="rva-btn" onClick={() => setEditing({ id: r.id, name: r.name, rating: r.rating, message: r.message, photos: r.photos || [] })}><FaEdit aria-hidden="true" /> Editar</button>
                                                <button type="button" className="rva-btn rva-btn--danger" disabled={busy === r.id} onClick={() => onDelete(r)} aria-label={`Eliminar reseña de ${r.name}`}><FaTrash aria-hidden="true" /></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            {lightbox && <PhotoLightbox {...lightbox} onClose={() => setLightbox(null)} />}
        </div>
    );
};

export default ReviewsAdmin;
