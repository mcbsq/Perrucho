// src/components/Reviews/Reviews.jsx
//
// Reseñas en la página del negocio (como Pastrana Events): cualquiera deja
// hasta 5 estrellas, su comentario y hasta 4 fotos; entra pendiente y el
// administrador la aprueba en Panel → Reseñas. En la página las fotos se ven
// todas en el mismo formato (4:3 recortado) y, al abrirlas, completas con
// sus proporciones originales.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaStar, FaRegStar, FaStarHalfAlt, FaTimes, FaCamera, FaChevronLeft, FaChevronRight, FaCheckCircle, FaPen } from 'react-icons/fa';
import { reviewsApi } from '../../api/apiClient';
import { uploadPhoto } from '../../utils/photoUpload';
import './Reviews.css';

export const Stars = ({ value, size = 16, label }) => (
    <span className="rvw-stars" role="img" aria-label={label || `${value} de 5 estrellas`} style={{ fontSize: size }}>
        {[1, 2, 3, 4, 5].map(n => {
            // Medias estrellas para promedios (4.5 → ★★★★⯪).
            const v = Math.round(value * 2) / 2;
            if (n <= v) return <FaStar key={n} aria-hidden="true" />;
            if (n - 0.5 === v) return <FaStarHalfAlt key={n} aria-hidden="true" />;
            return <FaRegStar key={n} aria-hidden="true" />;
        })}
    </span>
);

const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

// ─── Visor de fotos: formato original ───────────────────────────────────────
export const PhotoLightbox = ({ photos, start = 0, caption, onClose }) => {
    const [i, setI] = useState(start);
    const prev = useCallback(() => setI(x => (x > 0 ? x - 1 : x)), []);
    const next = useCallback(() => setI(x => (x < photos.length - 1 ? x + 1 : x)), [photos.length]);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
        document.addEventListener('keydown', onKey);
        const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = o; };
    }, [onClose, prev, next]);
    const p = photos[i];
    return createPortal(
        <div className="rvw-lightbox" role="dialog" aria-modal="true" aria-label="Foto de la reseña" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <button type="button" className="rvw-lb-close" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
            {photos.length > 1 && <button type="button" className="rvw-lb-nav rvw-lb-nav--prev" onClick={prev} disabled={i === 0} aria-label="Anterior"><FaChevronLeft /></button>}
            <figure className="rvw-lb-figure">
                <img key={p.url} src={p.url} alt={caption || 'Foto de la reseña'} />
                {(caption || photos.length > 1) && <figcaption>{caption}{photos.length > 1 && <span>{i + 1} / {photos.length}</span>}</figcaption>}
            </figure>
            {photos.length > 1 && <button type="button" className="rvw-lb-nav rvw-lb-nav--next" onClick={next} disabled={i === photos.length - 1} aria-label="Siguiente"><FaChevronRight /></button>}
        </div>,
        document.body
    );
};

// ─── Formulario ─────────────────────────────────────────────────────────────
const LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

const ReviewForm = ({ defaultName, services = [], onClose }) => {
    const [name, setName] = useState(defaultName || '');
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [message, setMessage] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(0);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = o; };
    }, [onClose]);

    const addFiles = async (files) => {
        setError('');
        const room = 4 - photos.length;
        for (const file of files.slice(0, room)) {
            setUploading(n => n + 1);
            try { const ph = await uploadPhoto(file, { payload: 'review' }); setPhotos(p => [...p, ph]); }
            catch (err) { setError(err.message || 'No se pudo subir la foto.'); }
            finally { setUploading(n => n - 1); }
        }
        if (files.length > room) setError('Puedes subir hasta 4 fotos.');
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!rating) return setError('Elige de 1 a 5 estrellas.');
        if (!name.trim()) return setError('Escribe tu nombre.');
        if (!message.trim()) return setError('Cuéntanos cómo te fue.');
        setSending(true); setError('');
        try { await reviewsApi.create({ name, rating, message, serviceName: serviceName || null, photos }); setSent(true); }
        catch (err) { setError(err.message || 'No se pudo enviar tu reseña.'); }
        finally { setSending(false); }
    };

    const shown = hover || rating;
    return createPortal(
        <div className="rvw-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="rvw-sheet" role="dialog" aria-modal="true" aria-labelledby="rvw-form-title">
                <header className="rvw-sheet-head">
                    <h3 id="rvw-form-title">{sent ? '¡Gracias por tu reseña!' : 'Deja tu reseña'}</h3>
                    <button type="button" className="rvw-icon-btn" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
                </header>
                {sent ? (
                    <div className="rvw-sent">
                        <FaCheckCircle aria-hidden="true" />
                        <p>La recibimos. Aparecerá en esta página en cuanto el negocio la revise.</p>
                        <button type="button" className="rvw-btn rvw-btn--primary" onClick={onClose}>Listo</button>
                    </div>
                ) : (
                    <form className="rvw-form" onSubmit={submit} noValidate>
                        <div className="rvw-rate" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                                    className={`rvw-rate-star ${n <= shown ? 'is-on' : ''}`}
                                    onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)} onBlur={() => setHover(0)}
                                    onClick={() => { setRating(n); setError(''); }}>
                                    {n <= shown ? <FaStar /> : <FaRegStar />}
                                </button>
                            ))}
                            <span className="rvw-rate-label" aria-live="polite">{LABELS[shown] || 'Toca para calificar'}</span>
                        </div>
                        <label className="rvw-field">
                            <span>Tu nombre</span>
                            <input value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" />
                        </label>
                        {services.length > 0 && (
                            <label className="rvw-field">
                                <span>¿Qué servicio recibiste? <em>opcional</em></span>
                                <select value={serviceName} onChange={e => setServiceName(e.target.value)}>
                                    <option value="">Elige uno…</option>
                                    {services.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="rvw-field">
                            <span>Tu experiencia</span>
                            <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} maxLength={2000}
                                placeholder="¿Qué te gustó? ¿Lo recomendarías?" />
                        </label>
                        <div className="rvw-field">
                            <span>Fotos <em>opcional, hasta 4</em></span>
                            <div className="rvw-upload">
                                {photos.map((p, idx) => (
                                    <figure key={idx} className="rvw-upload-item">
                                        <img src={p.url} alt="" />
                                        <button type="button" onClick={() => setPhotos(ps => ps.filter((_, j) => j !== idx))} aria-label="Quitar foto"><FaTimes /></button>
                                    </figure>
                                ))}
                                {Array.from({ length: uploading }).map((_, k) => <div key={`u${k}`} className="rvw-upload-item rvw-upload-item--busy"><span className="rvw-spinner" /></div>)}
                                {photos.length + uploading < 4 && (
                                    <button type="button" className="rvw-upload-add" onClick={() => fileRef.current?.click()}>
                                        <FaCamera aria-hidden="true" /><span>Agregar foto</span>
                                    </button>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                                onChange={e => { const f = [...e.target.files]; e.target.value = ''; addFiles(f); }} />
                        </div>
                        {error && <p className="rvw-error" role="alert">{error}</p>}
                        <div className="rvw-form-actions">
                            <button type="button" className="rvw-btn rvw-btn--ghost" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="rvw-btn rvw-btn--primary" disabled={sending || uploading > 0}>{sending ? 'Enviando…' : 'Enviar reseña'}</button>
                        </div>
                        <p className="rvw-note">Tu reseña se publica después de que el negocio la revise.</p>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

// ─── Sección pública ────────────────────────────────────────────────────────
export const ReviewsSection = ({ businessName, defaultName, services }) => {
    const [data, setData] = useState(null);
    const [writing, setWriting] = useState(false);
    const [lightbox, setLightbox] = useState(null); // { photos, start, caption }
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        reviewsApi.approved().then(setData).catch(() => setData({ reviews: [], count: 0, average: 0 }));
    }, []);
    if (!data) return null;
    const { reviews, count, average } = data;
    const visible = expanded ? reviews : reviews.slice(0, 6);
    const dist = [5, 4, 3, 2, 1].map(n => ({ n, c: reviews.filter(r => r.rating === n).length }));

    return (
        <section className="content-section rvw-section" aria-labelledby="rvw-title">
            <h3 id="rvw-title">Lo que dicen nuestros clientes</h3>
            {count === 0 ? (
                <div className="rvw-empty">
                    <p>Todavía no hay reseñas de {businessName || 'este negocio'}. Si ya nos visitaste, cuéntanos cómo te fue.</p>
                    <button type="button" className="rvw-btn rvw-btn--primary" onClick={() => setWriting(true)}><FaPen aria-hidden="true" /> Escribir la primera reseña</button>
                </div>
            ) : (
                <>
                    <div className="rvw-summary">
                        <div className="rvw-score">
                            <strong>{average.toFixed(1)}</strong>
                            <Stars value={average} size={20} label={`Promedio ${average.toFixed(1)} de 5`} />
                            <span>{count} reseña{count === 1 ? '' : 's'}</span>
                        </div>
                        <ul className="rvw-dist" aria-label="Distribución de calificaciones">
                            {dist.map(d => (
                                <li key={d.n}>
                                    <span>{d.n}</span><FaStar aria-hidden="true" />
                                    <span className="rvw-dist-bar"><span style={{ transform: `scaleX(${count ? d.c / count : 0})` }} /></span>
                                    <span className="rvw-dist-count">{d.c}</span>
                                </li>
                            ))}
                        </ul>
                        <button type="button" className="rvw-btn rvw-btn--primary" onClick={() => setWriting(true)}><FaPen aria-hidden="true" /> Escribir reseña</button>
                    </div>
                    <div className="rvw-grid">
                        {visible.map(r => (
                            <article key={r.id} className="rvw-card">
                                {(r.photos || []).length > 0 && (
                                    <div className={`rvw-card-photos rvw-card-photos--${Math.min(r.photos.length, 3)}`}>
                                        {r.photos.slice(0, 3).map((p, idx) => (
                                            <button key={idx} type="button" className="rvw-photo" onClick={() => setLightbox({ photos: r.photos, start: idx, caption: `${r.name} · ${r.serviceName || fmtDate(r.createdAt)}` })}
                                                aria-label={`Ver foto ${idx + 1} de ${r.name}`}>
                                                <img src={p.url} alt="" loading="lazy" />
                                                {idx === 2 && r.photos.length > 3 && <span className="rvw-photo-more">+{r.photos.length - 3}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="rvw-card-body">
                                    <Stars value={r.rating} />
                                    <p>{r.message}</p>
                                    <footer>
                                        <span className="rvw-avatar" aria-hidden="true">{r.name[0]?.toUpperCase()}</span>
                                        <span><strong>{r.name}</strong><small>{[r.serviceName, fmtDate(r.createdAt)].filter(Boolean).join(' · ')}</small></span>
                                    </footer>
                                </div>
                            </article>
                        ))}
                    </div>
                    {reviews.length > 6 && (
                        <div className="rvw-more">
                            <button type="button" className="rvw-btn rvw-btn--ghost" onClick={() => setExpanded(x => !x)}>
                                {expanded ? 'Ver menos' : `Ver las ${reviews.length} reseñas`}
                            </button>
                        </div>
                    )}
                </>
            )}
            {writing && <ReviewForm defaultName={defaultName} services={services} onClose={() => setWriting(false)} />}
            {lightbox && <PhotoLightbox {...lightbox} onClose={() => setLightbox(null)} />}
        </section>
    );
};

export default ReviewsSection;
