// src/components/shared/Expediente.jsx
//
// Expediente del paciente (mascota o, en negocios sin mascotas, el cliente).
// Pensado para el caso real de los negocios: "quiero lo mismo de la vez
// pasada" — el empleado abre el expediente, ve qué se le hizo (con fotos) y
// programa la siguiente cita con esos datos en un clic ("Repetir servicio" /
// "Agendar seguimiento"). Después de cada visita se llena una entrada
// con lo que se hizo y fotos/videos, que luego se ven en formato historias.
//
// Dos tipos (Settings.recordMode, "auto" decide por giro):
//   servicio → qué se hizo, estilo, productos, observaciones
//   medico   → nota médica tradicional: motivo, signos vitales, exploración,
//              diagnóstico, tratamiento, receta, indicaciones, próxima cita
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    FaTimes, FaPlus, FaRedo, FaCamera, FaVideo, FaTrash, FaEdit, FaChevronLeft, FaChevronRight,
    FaStethoscope, FaCut, FaHeartbeat, FaPills, FaNotesMedical, FaVolumeMute, FaVolumeUp, FaPrint,
} from 'react-icons/fa';
import { recordsApi, uploadsApi } from '../../api/apiClient';
import { readImageAsResizedDataUrl, resizeImageToBlob } from '../../utils/imageUpload';
import { uploadToBlob } from '../../utils/photoUpload';
import './Expediente.css';

// ─── Tipo de expediente ──────────────────────────────────────────────────────
export const resolveRecordMode = (settings) => {
    const m = settings?.recordMode;
    if (m === 'medico' || m === 'servicio') return m;
    return settings?.giro === 'clinica' ? 'medico' : 'servicio';
};

const DAY = 86400000;
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
const ago = (d) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / DAY);
    if (days <= 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 31) return `hace ${days} días`;
    const months = Math.round(days / 30);
    return months === 1 ? 'hace un mes' : `hace ${months} meses`;
};
// Fecha del <input type="date"> ↔ entrada: se guarda a mediodía LOCAL, así
// ninguna zona horaria la recorre al día anterior (medianoche UTC en México
// todavía es "ayer").
const toNoonISO = (ymd) => new Date(`${ymd}T12:00:00`).toISOString();
const toLocalYMD = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Antecedentes según tipo y paciente (mascota / persona).
const PROFILE_FIELDS = {
    servicio: {
        pet: [
            { key: 'alergias', label: 'Alergias o sensibilidades' },
            { key: 'comportamiento', label: 'Comportamiento', hint: 'Ej. nervioso con la secadora, muerde al cortar uñas' },
            { key: 'preferencias', label: 'Preferencias', hint: 'Corte, perfume, moño…' },
        ],
        person: [
            { key: 'alergias', label: 'Alergias o sensibilidades' },
            { key: 'preferencias', label: 'Preferencias', hint: 'Diseño, color, forma, productos…' },
        ],
    },
    medico: {
        pet: [
            { key: 'alergias', label: 'Alergias' },
            { key: 'vacunas', label: 'Vacunas', hint: 'Cuál y cuándo' },
            { key: 'desparasitacion', label: 'Desparasitación' },
            { key: 'esterilizado', label: 'Esterilizado(a)', hint: 'Sí / No / fecha' },
            { key: 'padecimientos', label: 'Padecimientos crónicos' },
            { key: 'medicamentos', label: 'Medicamentos actuales' },
            { key: 'cirugias', label: 'Cirugías previas' },
        ],
        person: [
            { key: 'tipoSangre', label: 'Tipo de sangre' },
            { key: 'alergias', label: 'Alergias' },
            { key: 'padecimientos', label: 'Padecimientos crónicos' },
            { key: 'medicamentos', label: 'Medicamentos actuales' },
            { key: 'quirurgicos', label: 'Antecedentes quirúrgicos' },
            { key: 'heredofamiliares', label: 'Antecedentes heredofamiliares' },
            { key: 'habitos', label: 'Hábitos', hint: 'Tabaco, alcohol, actividad física…' },
        ],
    },
};

const VITALS = {
    pet: [
        { key: 'peso', label: 'Peso', unit: 'kg' }, { key: 'temperatura', label: 'Temp.', unit: '°C' },
        { key: 'fc', label: 'FC', unit: 'lpm' }, { key: 'fr', label: 'FR', unit: 'rpm' },
    ],
    person: [
        { key: 'peso', label: 'Peso', unit: 'kg' }, { key: 'talla', label: 'Talla', unit: 'cm' },
        { key: 'temperatura', label: 'Temp.', unit: '°C' }, { key: 'ta', label: 'T/A', unit: 'mmHg' },
        { key: 'fc', label: 'FC', unit: 'lpm' }, { key: 'fr', label: 'FR', unit: 'rpm' },
        { key: 'satO2', label: 'SatO₂', unit: '%' },
    ],
};

// Sheet genérico en portal (cabecera y pie fijos, cuerpo con scroll).
const Sheet = ({ title, subtitle, icon, wide, onClose, children, footer, labelledBy = 'exp-sheet-title' }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [onClose]);
    return createPortal(
        <div className="exp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`exp-sheet ${wide ? 'exp-sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
                <header className="exp-sheet-header">
                    {icon}
                    <div className="exp-sheet-heading">
                        <h3 id={labelledBy}>{title}</h3>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <button type="button" className="exp-icon-btn" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
                </header>
                <div className="exp-sheet-body">{children}</div>
                {footer && <footer className="exp-sheet-footer">{footer}</footer>}
            </div>
        </div>,
        document.body
    );
};

// ─── Fotos y videos ──────────────────────────────────────────────────────────
const useBlobEnabled = () => {
    const [enabled, setEnabled] = useState(null);
    useEffect(() => {
        let on = true;
        uploadsApi.status().then(r => on && setEnabled(!!r.blob)).catch(() => on && setEnabled(false));
        return () => { on = false; };
    }, []);
    return enabled;
};

const MediaUploader = ({ media, onChange, blobEnabled }) => {
    const [busy, setBusy] = useState([]); // nombres subiendo
    const [error, setError] = useState('');
    const inputRef = useRef(null);
    const accept = blobEnabled ? 'image/*,video/mp4,video/quicktime,video/webm' : 'image/*';

    const addFiles = async (files) => {
        setError('');
        for (const file of files) {
            const isVideo = file.type.startsWith('video/');
            if (isVideo && !blobEnabled) { setError('Para subir videos hay que activar el almacenamiento (Vercel Blob).'); continue; }
            if (isVideo && file.size > 150 * 1024 * 1024) { setError(`"${file.name}" pesa más de 150 MB.`); continue; }
            setBusy(b => [...b, file.name]);
            try {
                let item;
                if (!blobEnabled) {
                    // Sin almacenamiento: foto comprimida dentro de la base.
                    const url = await readImageAsResizedDataUrl(file, { maxDim: 1280, type: 'image/jpeg', quality: 0.8, maxSizeBytes: 40 * 1024 * 1024 });
                    item = { url, type: 'image' };
                } else {
                    const body = isVideo ? file : await resizeImageToBlob(file, { maxDim: 1920, quality: 0.85 });
                    const ext = isVideo ? (file.name.split('.').pop() || 'mp4') : 'jpg';
                    const res = await uploadToBlob(`expediente/${Date.now()}.${ext}`, body, {
                        payload: 'record', contentType: isVideo ? file.type : 'image/jpeg',
                    });
                    item = { url: res.url, type: isVideo ? 'video' : 'image' };
                }
                onChange(prev => [...prev, item]);
            } catch (err) {
                setError(err.message || `No se pudo subir "${file.name}".`);
            } finally {
                setBusy(b => b.filter(n => n !== file.name));
            }
        }
    };

    return (
        <div className="exp-media">
            <div className="exp-media-grid">
                {media.map((m, i) => (
                    <figure key={i} className="exp-media-item">
                        {m.type === 'video' ? <video src={m.url} muted playsInline preload="metadata" /> : <img src={m.url} alt="" />}
                        {m.type === 'video' && <span className="exp-media-badge"><FaVideo aria-hidden="true" /></span>}
                        <button type="button" className="exp-media-remove" onClick={() => onChange(prev => prev.filter((_, idx) => idx !== i))} aria-label="Quitar"><FaTimes /></button>
                    </figure>
                ))}
                {busy.map(n => <div key={n} className="exp-media-item exp-media-item--busy"><span className="exp-spinner" aria-label={`Subiendo ${n}`} /></div>)}
                <button type="button" className="exp-media-add" onClick={() => inputRef.current?.click()}>
                    <FaCamera aria-hidden="true" />
                    <span>{blobEnabled ? 'Foto o video' : 'Agregar foto'}</span>
                </button>
            </div>
            <input ref={inputRef} type="file" accept={accept} multiple hidden
                onChange={e => { const files = [...e.target.files]; e.target.value = ''; addFiles(files); }} />
            {error && <p className="exp-error" role="alert">{error}</p>}
            {blobEnabled === false && <p className="exp-hint">Los videos se activan al conectar el almacenamiento de archivos (Vercel Blob).</p>}
        </div>
    );
};

// ─── Formulario de entrada (servicio o médica) ───────────────────────────────
const Field = ({ label, children, span, hint }) => (
    <label className={`exp-field ${span ? 'exp-field--span' : ''}`}>
        <span className="exp-field-label">{label}</span>
        {children}
        {hint && <span className="exp-hint">{hint}</span>}
    </label>
);

export const RecordEntryForm = ({ mode, subject, initial, services = [], onSaved, onClose }) => {
    const isEdit = !!initial?.id;
    const isPerson = subject.type === 'client';
    const blobEnabled = useBlobEnabled();
    const [form, setForm] = useState(() => ({
        date: initial?.date ? toLocalYMD(initial.date) : todayISO(),
        serviceId: initial?.serviceId ? String(initial.serviceId) : '',
        serviceName: initial?.serviceName || '',
        summary: initial?.summary || '',
        details: { ...(initial?.details || {}) },
        appointmentId: initial?.appointmentId || null,
    }));
    const [media, setMedia] = useState(() => initial?.media || []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const d = form.details;
    const setD = (patch) => setForm(f => ({ ...f, details: { ...f.details, ...patch } }));
    const recipe = Array.isArray(d.receta) ? d.receta : [];
    const vitals = d.signos || {};

    const pickService = (id) => {
        const svc = services.find(s => String(s.id) === String(id));
        setForm(f => ({ ...f, serviceId: id, serviceName: svc?.title || f.serviceName }));
    };

    const save = async () => {
        setError('');
        const summary = mode === 'medico'
            ? (form.summary || d.diagnostico || d.motivo || '').trim()
            : form.summary.trim();
        if (!summary && !media.length) { setError(mode === 'medico' ? 'Escribe al menos el motivo o el diagnóstico.' : 'Escribe qué se hizo o agrega una foto.'); return; }
        setSaving(true);
        try {
            const payload = {
                kind: mode, date: toNoonISO(form.date),
                serviceId: form.serviceId || null, serviceName: form.serviceName || null,
                summary, details: { ...d, receta: recipe.filter(r => r.medicamento) }, media,
                appointmentId: form.appointmentId,
                ...(subject.type === 'pet' ? { petId: subject.id } : { clientId: subject.id }),
            };
            const saved = isEdit ? await recordsApi.update(initial.id, payload) : await recordsApi.create(payload);
            onSaved(saved);
        } catch (err) {
            setError(err.message || 'No se pudo guardar.');
            setSaving(false);
        }
    };

    return (
        <Sheet
            labelledBy="exp-form-title"
            icon={<span className={`exp-sheet-icon exp-sheet-icon--${mode}`}>{mode === 'medico' ? <FaStethoscope /> : <FaCut />}</span>}
            title={isEdit ? 'Editar entrada' : mode === 'medico' ? 'Nota de consulta' : 'Registrar visita'}
            subtitle={subject.name}
            onClose={onClose}
            footer={<>
                {error ? <p className="exp-error" role="alert">{error}</p> : <span />}
                <div className="exp-actions">
                    <button type="button" className="exp-btn exp-btn--ghost" onClick={onClose}>Cancelar</button>
                    <button type="button" className="exp-btn exp-btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar en expediente'}</button>
                </div>
            </>}
        >
            <div className="exp-grid">
                <Field label="Fecha"><input type="date" value={form.date} max={todayISO()} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
                <Field label={mode === 'medico' ? 'Tipo de consulta' : 'Servicio'}>
                    {services.length > 0 ? (
                        <select value={form.serviceId} onChange={e => pickService(e.target.value)}>
                            <option value="">{form.serviceName || 'Elige…'}</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                    ) : <input value={form.serviceName} onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} />}
                </Field>
            </div>

            {mode === 'servicio' ? (
                <div className="exp-grid">
                    <Field label="¿Qué se le hizo?" span hint="Lo que el siguiente empleado necesita para repetirlo igual.">
                        <textarea rows={3} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                            placeholder={isPerson ? 'Ej. Gelish francés, forma almendra, largo medio' : 'Ej. Baño, corte cachorro con #5 en cuerpo y tijera en cara'} />
                    </Field>
                    <Field label="Estilo / indicaciones"><input value={d.estilo || ''} onChange={e => setD({ estilo: e.target.value })} placeholder={isPerson ? 'Color, diseño, técnica…' : 'Tipo de corte, largo, moño…'} /></Field>
                    <Field label="Productos usados"><input value={d.productos || ''} onChange={e => setD({ productos: e.target.value })} placeholder="Shampoo, perfume, esmalte…" /></Field>
                    <Field label="Observaciones" span hint={isPerson ? undefined : 'Cómo llegó y cómo se fue, comportamiento, algo que avisar.'}>
                        <textarea rows={2} value={d.observaciones || ''} onChange={e => setD({ observaciones: e.target.value })} />
                    </Field>
                </div>
            ) : (
                <>
                    <div className="exp-grid">
                        <Field label="Motivo de consulta" span><input value={d.motivo || ''} onChange={e => setD({ motivo: e.target.value })} /></Field>
                        <Field label="Padecimiento actual" span><textarea rows={2} value={d.padecimiento || ''} onChange={e => setD({ padecimiento: e.target.value })} /></Field>
                    </div>
                    <div className="exp-subhead"><FaHeartbeat aria-hidden="true" /> Signos vitales</div>
                    <div className="exp-vitals">
                        {VITALS[isPerson ? 'person' : 'pet'].map(v => (
                            <label key={v.key} className="exp-vital">
                                <span>{v.label}</span>
                                <span className="exp-vital-input">
                                    <input inputMode="decimal" value={vitals[v.key] || ''} onChange={e => setD({ signos: { ...vitals, [v.key]: e.target.value } })} />
                                    <small>{v.unit}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="exp-grid">
                        <Field label="Exploración física" span><textarea rows={2} value={d.exploracion || ''} onChange={e => setD({ exploracion: e.target.value })} /></Field>
                        <Field label="Diagnóstico" span><textarea rows={2} value={d.diagnostico || ''} onChange={e => setD({ diagnostico: e.target.value })} /></Field>
                        <Field label="Tratamiento / plan" span><textarea rows={2} value={d.tratamiento || ''} onChange={e => setD({ tratamiento: e.target.value })} /></Field>
                    </div>
                    <div className="exp-subhead"><FaPills aria-hidden="true" /> Receta</div>
                    <div className="exp-recipe">
                        {recipe.map((r, i) => (
                            <div key={i} className="exp-recipe-row">
                                {['medicamento', 'dosis', 'frecuencia', 'duracion'].map(k => (
                                    <input key={k} aria-label={k} placeholder={{ medicamento: 'Medicamento', dosis: 'Dosis', frecuencia: 'Cada…', duracion: 'Por…' }[k]}
                                        value={r[k] || ''} onChange={e => setD({ receta: recipe.map((x, idx) => idx === i ? { ...x, [k]: e.target.value } : x) })} />
                                ))}
                                <button type="button" className="exp-icon-btn exp-icon-btn--danger" aria-label="Quitar medicamento" onClick={() => setD({ receta: recipe.filter((_, idx) => idx !== i) })}><FaTrash /></button>
                            </div>
                        ))}
                        <button type="button" className="exp-add" onClick={() => setD({ receta: [...recipe, { medicamento: '', dosis: '', frecuencia: '', duracion: '' }] })}><FaPlus aria-hidden="true" /> Agregar medicamento</button>
                    </div>
                    <div className="exp-grid">
                        <Field label="Indicaciones" span><textarea rows={2} value={d.indicaciones || ''} onChange={e => setD({ indicaciones: e.target.value })} /></Field>
                        <Field label="Próxima revisión"><input type="date" value={d.proximaCita || ''} onChange={e => setD({ proximaCita: e.target.value })} /></Field>
                    </div>
                </>
            )}

            <div className="exp-subhead"><FaCamera aria-hidden="true" /> Fotos y videos</div>
            <MediaUploader media={media} onChange={setMedia} blobEnabled={blobEnabled} />
        </Sheet>
    );
};

// ─── Visor de historias ──────────────────────────────────────────────────────
export const StoryViewer = ({ stories, startIndex = 0, subjectName, onClose }) => {
    const [i, setI] = useState(startIndex);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(true);
    const videoRef = useRef(null);
    const story = stories[i];
    const IMAGE_MS = 5000;

    const next = useCallback(() => {
        if (i + 1 >= stories.length) { onClose(); return; }
        setProgress(0);
        setI(i + 1);
    }, [i, stories.length, onClose]);
    const prev = useCallback(() => { setProgress(0); setI(x => Math.max(0, x - 1)); }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
    }, [next, prev, onClose]);

    // Avance automático de fotos; los videos avanzan al terminar.
    useEffect(() => {
        if (!story || story.type === 'video' || paused) return undefined;
        const started = Date.now() - progress * IMAGE_MS;
        const t = setInterval(() => {
            const p = (Date.now() - started) / IMAGE_MS;
            if (p >= 1) { clearInterval(t); next(); } else setProgress(p);
        }, 50);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i, paused]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (paused) v.pause(); else v.play().catch(() => {});
    }, [paused, i]);

    if (!story) return null;
    return createPortal(
        <div className="exp-story" role="dialog" aria-modal="true" aria-label={`Historias de ${subjectName}`}>
            <div className="exp-story-frame">
                <div className="exp-story-bars">
                    {stories.map((_, idx) => (
                        <span key={idx} className="exp-story-bar"><span style={{ transform: `scaleX(${idx < i ? 1 : idx === i ? progress : 0})` }} /></span>
                    ))}
                </div>
                <div className="exp-story-top">
                    <div>
                        <strong>{story.serviceName || subjectName}</strong>
                        <span>{fmtDate(story.date)} · {ago(story.date)}</span>
                    </div>
                    {story.type === 'video' && (
                        <button type="button" className="exp-story-btn" onClick={() => setMuted(m => !m)} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
                            {muted ? <FaVolumeMute /> : <FaVolumeUp />}
                        </button>
                    )}
                    <button type="button" className="exp-story-btn" onClick={onClose} aria-label="Cerrar historias"><FaTimes /></button>
                </div>
                <div className="exp-story-media"
                    onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
                    {story.type === 'video'
                        ? <video key={story.url} ref={videoRef} src={story.url} autoPlay playsInline muted={muted}
                            onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
                            onEnded={next} />
                        : <img key={story.url} src={story.url} alt={story.caption || story.serviceName || ''} />}
                </div>
                <button type="button" className="exp-story-nav exp-story-nav--prev" onClick={prev} aria-label="Anterior" disabled={i === 0}><FaChevronLeft /></button>
                <button type="button" className="exp-story-nav exp-story-nav--next" onClick={next} aria-label="Siguiente"><FaChevronRight /></button>
                {(story.summary || story.caption) && <p className="exp-story-caption">{story.caption || story.summary}</p>}
            </div>
        </div>,
        document.body
    );
};

// ─── Detalle de una entrada (línea de tiempo) ────────────────────────────────
const MedicalDetails = ({ d }) => {
    const vit = Object.entries(d.signos || {}).filter(([, v]) => v);
    const rows = [
        ['Motivo', d.motivo], ['Padecimiento actual', d.padecimiento], ['Exploración física', d.exploracion],
        ['Diagnóstico', d.diagnostico], ['Tratamiento', d.tratamiento], ['Indicaciones', d.indicaciones],
    ].filter(([, v]) => v);
    return (
        <div className="exp-med">
            {vit.length > 0 && <div className="exp-med-vitals">{vit.map(([k, v]) => <span key={k}><b>{({ peso: 'Peso', talla: 'Talla', temperatura: 'Temp', ta: 'T/A', fc: 'FC', fr: 'FR', satO2: 'SatO₂' })[k] || k}</b> {v}</span>)}</div>}
            <dl>{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
            {Array.isArray(d.receta) && d.receta.length > 0 && (
                <div className="exp-med-rx">
                    <span>Receta</span>
                    <ul>{d.receta.map((r, i) => <li key={i}><b>{r.medicamento}</b>{[r.dosis, r.frecuencia && `cada ${r.frecuencia.replace(/^cada\s*/i, '')}`, r.duracion && `por ${r.duracion.replace(/^por\s*/i, '')}`].filter(Boolean).map(x => ` · ${x}`)}</li>)}</ul>
                </div>
            )}
            {d.proximaCita && <p className="exp-med-next">Próxima revisión: {fmtDate(d.proximaCita + 'T12:00:00')}</p>}
        </div>
    );
};

const printEntry = (entry, subjectName, settings) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const d = entry.details || {};
    const esc = (s) => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const rows = [['Motivo', d.motivo], ['Padecimiento actual', d.padecimiento], ['Exploración física', d.exploracion], ['Diagnóstico', d.diagnostico], ['Tratamiento', d.tratamiento], ['Indicaciones', d.indicaciones]].filter(([, v]) => v);
    const vit = Object.entries(d.signos || {}).filter(([, v]) => v).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ');
    const rx = (d.receta || []).filter(r => r.medicamento).map(r => `<li><b>${esc(r.medicamento)}</b> ${esc([r.dosis, r.frecuencia, r.duracion].filter(Boolean).join(' · '))}</li>`).join('');
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Nota — ${esc(subjectName)}</title>
<style>body{font:14px/1.5 -apple-system,Segoe UI,sans-serif;color:#111;max-width:720px;margin:32px auto;padding:0 24px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:20px 0 4px}.meta{color:#555;margin:4px 0 18px}dt{font-weight:700;margin-top:10px}dd{margin:2px 0 0}hr{border:0;border-top:1px solid #ccc;margin:18px 0}.firma{margin-top:64px;border-top:1px solid #333;width:260px;text-align:center;padding-top:6px}</style></head><body>
<h1>${esc(settings?.businessName || '')}</h1><div class="meta">${esc(settings?.businessAddress || '')}</div><hr>
<h2>Paciente: ${esc(subjectName)}</h2><div class="meta">${esc(fmtDate(entry.date))}${entry.serviceName ? ' · ' + esc(entry.serviceName) : ''}${entry.authorName ? ' · Atendió: ' + esc(entry.authorName) : ''}</div>
${vit ? `<p><b>Signos vitales:</b> ${vit}</p>` : ''}
<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
${rx ? `<h2>Receta</h2><ul>${rx}</ul>` : ''}
${!rows.length && entry.summary ? `<p>${esc(entry.summary)}</p>` : ''}
${d.proximaCita ? `<p><b>Próxima revisión:</b> ${esc(d.proximaCita)}</p>` : ''}
<div class="firma">${esc(entry.authorName || 'Firma')}</div>
<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
};

// ─── Expediente completo ─────────────────────────────────────────────────────
// subject: { type: 'pet' | 'client', id, name, meta, profile, owners? }
export const PatientRecord = ({ subject, settings, services = [], canDelete, currentUser, onRepeat, onSaveProfile, onClose, autoNew }) => {
    const mode = resolveRecordMode(settings);
    const kindOfSubject = subject.type === 'client' ? 'person' : 'pet';
    const [entries, setEntries] = useState(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(autoNew ? (autoNew === true ? {} : autoNew) : null);
    const [story, setStory] = useState(null); // índice inicial
    const [profile, setProfile] = useState(subject.profile || {});
    const [profileDirty, setProfileDirty] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const load = useCallback(() => {
        const call = subject.type === 'pet' ? recordsApi.forPet(subject.id) : recordsApi.forClient(subject.id);
        call.then(setEntries).catch(err => { setError(err.message || 'No se pudo cargar el expediente.'); setEntries([]); });
    }, [subject.type, subject.id]);
    useEffect(() => { load(); }, [load]);

    const stories = useMemo(() => (entries || []).slice().reverse().flatMap(e =>
        (e.media || []).map(m => ({ ...m, date: e.date, serviceName: e.serviceName, summary: e.summary, entryId: e.id }))), [entries]);
    const storyEntries = useMemo(() => (entries || []).filter(e => (e.media || []).length), [entries]);
    const last = entries?.[0];
    const fields = PROFILE_FIELDS[mode][kindOfSubject];
    const filledProfile = fields.filter(f => profile[f.key]);

    const openStoriesAt = (entryId) => {
        const idx = stories.findIndex(s => s.entryId === entryId);
        if (idx >= 0) setStory(idx);
    };
    const saveProfile = async () => {
        setSavingProfile(true);
        try { await onSaveProfile(profile); setProfileDirty(false); }
        catch (err) { setError(err.message || 'No se pudieron guardar los antecedentes.'); }
        finally { setSavingProfile(false); }
    };
    const remove = async (entry) => {
        if (!window.confirm('¿Eliminar esta entrada del expediente? No se puede deshacer.')) return;
        try { await recordsApi.delete(entry.id); setEntries(es => es.filter(e => e.id !== entry.id)); }
        catch (err) { setError(err.message || 'No se pudo eliminar.'); }
    };

    return (
        <>
            <Sheet wide labelledBy="exp-record-title"
                icon={<span className="exp-avatar" aria-hidden="true">{(subject.name || '?')[0].toUpperCase()}</span>}
                title={`Expediente — ${subject.name}`}
                subtitle={subject.meta}
                onClose={onClose}
                footer={<>
                    <span className="exp-hint">{mode === 'medico' ? 'Expediente médico' : 'Expediente de servicio'} · {entries ? `${entries.length} visita${entries.length === 1 ? '' : 's'}` : 'cargando…'}</span>
                    <div className="exp-actions">
                        <button type="button" className="exp-btn exp-btn--primary" onClick={() => setEditing({})}><FaPlus aria-hidden="true" /> {mode === 'medico' ? 'Nueva nota' : 'Registrar visita'}</button>
                    </div>
                </>}
            >
                {error && <p className="exp-error" role="alert">{error}</p>}
                <div className="exp-layout">
                    <div className="exp-main">
                        {entries === null ? (
                            <div className="exp-skeleton" aria-label="Cargando expediente" />
                        ) : !last ? (
                            <div className="exp-empty">
                                {mode === 'medico' ? <FaNotesMedical aria-hidden="true" /> : <FaCut aria-hidden="true" />}
                                <div>
                                    <strong>Sin visitas registradas</strong>
                                    <p>Al terminar cada {mode === 'medico' ? 'consulta' : 'servicio'}, registra qué se hizo y sube fotos: la próxima vez sabrás exactamente qué repetir.</p>
                                </div>
                            </div>
                        ) : (
                            <section className="exp-last" aria-labelledby="exp-last-title">
                                <div className="exp-last-head">
                                    <span id="exp-last-title" className="exp-last-label">Última visita · {ago(last.date)}</span>
                                    <span className="exp-muted">{fmtDate(last.date)}{last.authorName ? ` · ${last.authorName}` : ''}</span>
                                </div>
                                <h4>{last.serviceName || (last.kind === 'medico' ? 'Consulta' : 'Visita')}</h4>
                                {last.summary && <p className="exp-last-summary">{last.summary}</p>}
                                {last.kind !== 'medico' && (last.details?.estilo || last.details?.productos) && (
                                    <div className="exp-chips">
                                        {last.details.estilo && <span><b>Estilo</b> {last.details.estilo}</span>}
                                        {last.details.productos && <span><b>Productos</b> {last.details.productos}</span>}
                                    </div>
                                )}
                                {(last.media || []).length > 0 && (
                                    <div className="exp-thumbs">
                                        {last.media.slice(0, 4).map((m, i) => (
                                            <button key={i} type="button" className="exp-thumb" onClick={() => openStoriesAt(last.id)} aria-label="Ver fotos de la última visita">
                                                {m.type === 'video' ? <video src={m.url} muted playsInline preload="metadata" /> : <img src={m.url} alt="" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {onRepeat && (
                                    <button type="button" className="exp-btn exp-btn--soft" onClick={() => onRepeat({
                                        ...last,
                                        // Entradas viejas o escritas a mano solo traen el nombre.
                                        serviceId: last.serviceId || services.find(sv => sv.title === last.serviceName)?.id || null,
                                    })}>
                                        <FaRedo aria-hidden="true" /> {mode === 'medico' ? 'Agendar seguimiento' : 'Repetir servicio'}
                                    </button>
                                )}
                            </section>
                        )}

                        {storyEntries.length > 0 && (
                            <section className="exp-stories" aria-label="Historias">
                                {storyEntries.map(e => (
                                    <button key={e.id} type="button" className="exp-story-ring" onClick={() => openStoriesAt(e.id)}>
                                        <span className="exp-story-ring-img">
                                            {e.media[0].type === 'video' ? <video src={e.media[0].url} muted playsInline preload="metadata" /> : <img src={e.media[0].url} alt="" />}
                                        </span>
                                        <span>{fmtShort(e.date)}</span>
                                    </button>
                                ))}
                            </section>
                        )}

                        {entries && entries.length > 0 && (
                            <section className="exp-timeline" aria-label="Historial">
                                <h4 className="exp-section-title">Historial</h4>
                                <ol>
                                    {entries.map(e => (
                                        <li key={e.id} className="exp-entry">
                                            <div className="exp-entry-date"><b>{fmtShort(e.date)}</b><span>{new Date(e.date).getFullYear()}</span></div>
                                            <div className="exp-entry-card">
                                                <div className="exp-entry-head">
                                                    <strong>{e.serviceName || (e.kind === 'medico' ? 'Consulta' : 'Visita')}</strong>
                                                    <span className="exp-muted">{e.authorName || ''}</span>
                                                    <span className="exp-entry-tools">
                                                        {e.kind === 'medico' && <button type="button" className="exp-icon-btn" onClick={() => printEntry(e, subject.name, settings)} aria-label="Imprimir nota"><FaPrint /></button>}
                                                        {(canDelete || e.authorId === currentUser?.id) && <button type="button" className="exp-icon-btn" onClick={() => setEditing(e)} aria-label="Editar entrada"><FaEdit /></button>}
                                                        {canDelete && <button type="button" className="exp-icon-btn exp-icon-btn--danger" onClick={() => remove(e)} aria-label="Eliminar entrada"><FaTrash /></button>}
                                                    </span>
                                                </div>
                                                {e.kind === 'medico'
                                                    ? <MedicalDetails d={e.details || {}} />
                                                    : <>
                                                        {e.summary && <p>{e.summary}</p>}
                                                        {(e.details?.estilo || e.details?.productos || e.details?.observaciones) && (
                                                            <div className="exp-chips">
                                                                {e.details.estilo && <span><b>Estilo</b> {e.details.estilo}</span>}
                                                                {e.details.productos && <span><b>Productos</b> {e.details.productos}</span>}
                                                                {e.details.observaciones && <span><b>Obs.</b> {e.details.observaciones}</span>}
                                                            </div>
                                                        )}
                                                    </>}
                                                {(e.media || []).length > 0 && (
                                                    <div className="exp-thumbs exp-thumbs--sm">
                                                        {e.media.map((m, i) => (
                                                            <button key={i} type="button" className="exp-thumb" onClick={() => openStoriesAt(e.id)} aria-label="Ver en historias">
                                                                {m.type === 'video' ? <video src={m.url} muted playsInline preload="metadata" /> : <img src={m.url} alt="" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}
                    </div>

                    <aside className="exp-aside">
                        <section className="exp-profile" aria-labelledby="exp-profile-title">
                            <h4 id="exp-profile-title" className="exp-section-title">{mode === 'medico' ? 'Antecedentes' : 'Para tenerlo presente'}</h4>
                            {subject.owners?.length > 0 && <p className="exp-muted">Dueño{subject.owners.length > 1 ? 's' : ''}: {subject.owners.map(o => o.name).join(', ')}</p>}
                            {filledProfile.length === 0 && !profileDirty && <p className="exp-hint">Sin datos todavía.</p>}
                            {fields.map(f => (
                                <label key={f.key} className="exp-field">
                                    <span className="exp-field-label">{f.label}</span>
                                    <textarea rows={1} value={profile[f.key] || ''} placeholder={f.hint || ''}
                                        onChange={e => { setProfile(p => ({ ...p, [f.key]: e.target.value })); setProfileDirty(true); }} />
                                </label>
                            ))}
                            {profileDirty && <button type="button" className="exp-btn exp-btn--primary exp-btn--block" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Guardando…' : 'Guardar antecedentes'}</button>}
                        </section>
                    </aside>
                </div>
            </Sheet>

            {editing && (
                <RecordEntryForm mode={editing.kind || mode} subject={subject} initial={editing.id ? editing : { ...editing }}
                    services={services}
                    onClose={() => setEditing(null)}
                    onSaved={(saved) => {
                        setEditing(null);
                        setEntries(es => {
                            const rest = (es || []).filter(e => e.id !== saved.id);
                            return [saved, ...rest].sort((a, b) => new Date(b.date) - new Date(a.date));
                        });
                    }} />
            )}
            {story !== null && stories.length > 0 && (
                <StoryViewer stories={stories} startIndex={story} subjectName={subject.name} onClose={() => setStory(null)} />
            )}
        </>
    );
};

export default PatientRecord;

// Vista rápida de la última visita (panel lateral de la agenda del empleado):
// lo justo para "lo mismo de la vez pasada" sin abrir el expediente completo.
export const LastVisitPeek = ({ type, id }) => {
    const [last, setLast] = useState(undefined);
    useEffect(() => {
        let on = true;
        setLast(undefined);
        const call = type === 'pet' ? recordsApi.forPet(id) : recordsApi.forClient(id);
        call.then(list => on && setLast(list[0] || null)).catch(() => on && setLast(null));
        return () => { on = false; };
    }, [type, id]);
    if (last === undefined) return <div className="exp-peek exp-peek--loading" aria-label="Cargando última visita" />;
    if (!last) return <div className="exp-peek"><span className="exp-last-label">Primera visita</span><p className="exp-muted">Todavía no hay nada en su expediente.</p></div>;
    return (
        <div className="exp-peek">
            <span className="exp-last-label">Última visita · {ago(last.date)}</span>
            <strong>{last.serviceName || 'Visita'}</strong>
            {last.summary && <p>{last.summary}</p>}
            {last.details?.estilo && <p className="exp-muted"><b>Estilo:</b> {last.details.estilo}</p>}
            {(last.media || []).length > 0 && (
                <div className="exp-thumbs exp-thumbs--sm">
                    {last.media.slice(0, 3).map((m, i) => (
                        <span key={i} className="exp-thumb">{m.type === 'video' ? <video src={m.url} muted playsInline preload="metadata" /> : <img src={m.url} alt="" />}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Para el cliente (Mi perfil): sus visitas y fotos, solo lectura ─────────
// subjects: [{ type: 'pet' | 'client', id, name }]
const SubjectVisits = ({ subject }) => {
    const [entries, setEntries] = useState(null);
    const [story, setStory] = useState(null);
    useEffect(() => {
        const call = subject.type === 'pet' ? recordsApi.forPet(subject.id) : recordsApi.forClient(subject.id);
        call.then(setEntries).catch(() => setEntries([]));
    }, [subject.type, subject.id]);
    const stories = useMemo(() => (entries || []).slice().reverse().flatMap(e =>
        (e.media || []).map(m => ({ ...m, date: e.date, serviceName: e.serviceName, summary: e.summary, entryId: e.id }))), [entries]);
    const withMedia = (entries || []).filter(e => (e.media || []).length);
    const openAt = (id) => { const i = stories.findIndex(s => s.entryId === id); if (i >= 0) setStory(i); };

    return (
        <div className="exp-client-block">
            <div className="exp-client-head">
                <span className="exp-avatar" aria-hidden="true">{(subject.name || '?')[0].toUpperCase()}</span>
                <strong>{subject.name}</strong>
                {entries && <span className="exp-muted">{entries.length} visita{entries.length === 1 ? '' : 's'}</span>}
            </div>
            {entries === null ? <div className="exp-peek exp-peek--loading" />
                : entries.length === 0 ? <p className="exp-muted">Todavía no hay visitas registradas.</p>
                : <>
                    {withMedia.length > 0 && (
                        <div className="exp-stories" aria-label={`Fotos de ${subject.name}`}>
                            {withMedia.map(e => (
                                <button key={e.id} type="button" className="exp-story-ring" onClick={() => openAt(e.id)}>
                                    <span className="exp-story-ring-img">
                                        {e.media[0].type === 'video' ? <video src={e.media[0].url} muted playsInline preload="metadata" /> : <img src={e.media[0].url} alt="" />}
                                    </span>
                                    <span>{fmtShort(e.date)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <ol className="exp-client-list">
                        {entries.map(e => (
                            <li key={e.id}>
                                <span className="exp-client-date">{fmtDate(e.date)}</span>
                                <div>
                                    <strong>{e.serviceName || (e.kind === 'medico' ? 'Consulta' : 'Visita')}</strong>
                                    {e.kind === 'medico'
                                        ? <>
                                            {e.details?.diagnostico && <p><b>Diagnóstico:</b> {e.details.diagnostico}</p>}
                                            {e.details?.indicaciones && <p><b>Indicaciones:</b> {e.details.indicaciones}</p>}
                                            {Array.isArray(e.details?.receta) && e.details.receta.length > 0 && (
                                                <p><b>Receta:</b> {e.details.receta.map(r => [r.medicamento, r.dosis, r.frecuencia && `cada ${r.frecuencia}`, r.duracion && `por ${r.duracion}`].filter(Boolean).join(' ')).join('; ')}</p>
                                            )}
                                            {e.details?.proximaCita && <p><b>Próxima revisión:</b> {fmtDate(e.details.proximaCita + 'T12:00:00')}</p>}
                                        </>
                                        : e.summary && <p>{e.summary}</p>}
                                    {(e.media || []).length > 0 && <button type="button" className="exp-link" onClick={() => openAt(e.id)}>Ver {e.media.length} foto{e.media.length === 1 ? '' : 's'}</button>}
                                </div>
                            </li>
                        ))}
                    </ol>
                </>}
            {story !== null && <StoryViewer stories={stories} startIndex={story} subjectName={subject.name} onClose={() => setStory(null)} />}
        </div>
    );
};

export const ClientVisits = ({ subjects }) => (
    <div className="exp-client">
        {subjects.map(s => <SubjectVisits key={`${s.type}-${s.id}`} subject={s} />)}
    </div>
);
