// src/components/shared/SettingsHub.jsx
//
// Personalización del sitio, en módulos. Antes era un solo formulario larguí-
// simo (marca, imágenes, contacto, textos de inicio, giro, horarios…) con un
// único "Guardar" hasta abajo. Ahora cada área es una tarjeta que muestra su
// estado actual de un vistazo (logo, colores, horario, ticket…) y abre su
// propio pop-up con Cancelar / Guardar: se edita una cosa a la vez y lo que
// no se guardó no se pierde en otra sección.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    FaFingerprint, FaPalette, FaAddressBook, FaStore, FaHome, FaLink, FaReceipt,
    FaSlidersH, FaClock, FaTimes, FaChevronRight, FaPlus, FaTrash, FaStar, FaMapMarkerAlt,
    FaPhone, FaCheck,
} from 'react-icons/fa';
import { ImagePicker, DAY_LABELS } from './DashboardShared';
import { TicketPreview } from './Ticket';
import { PAPER_OPTIONS, resolveTicketConfig, DEFAULT_TICKET_CONFIG } from '../../utils/ticketPdf';
import { readImageAsResizedDataUrl } from '../../utils/imageUpload';
import './SettingsHub.css';

// ─── Pop-up de una sección ────────────────────────────────────────────────────
const Sheet = ({ title, description, icon, onClose, onSave, saving, dirty, wide, children, footerNote }) => {
    const sheetRef = useRef(null);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        sheetRef.current?.querySelector('input, select, textarea, button:not(.sh-sheet-close)')?.focus();
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [onClose]);

    return createPortal(
        <div className="sh-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={sheetRef} className={`sh-sheet ${wide ? 'sh-sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sh-sheet-title">
                <header className="sh-sheet-header">
                    <span className="sh-sheet-icon" aria-hidden="true">{icon}</span>
                    <div className="sh-sheet-heading">
                        <h3 id="sh-sheet-title">{title}</h3>
                        {description && <p>{description}</p>}
                    </div>
                    <button type="button" className="sh-sheet-close" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
                </header>
                <div className="sh-sheet-body">{children}</div>
                <footer className="sh-sheet-footer">
                    <span className={`sh-sheet-note ${!footerNote && dirty ? 'is-dirty' : ''}`}>{footerNote || (dirty ? 'Cambios sin guardar' : '')}</span>
                    {onSave ? (
                        <div className="sh-sheet-actions">
                            <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>Cancelar</button>
                            <button type="button" className="sh-btn sh-btn--primary" onClick={onSave} disabled={saving || !dirty}>
                                {saving ? 'Guardando…' : 'Guardar cambios'}
                            </button>
                        </div>
                    ) : (
                        <div className="sh-sheet-actions">
                            <button type="button" className="sh-btn sh-btn--primary" onClick={onClose}>Listo</button>
                        </div>
                    )}
                </footer>
            </div>
        </div>,
        document.body
    );
};

// Campo etiquetado (label arriba, ayuda opcional abajo).
// `group`: el campo tiene varios controles (imagen, color) — un <label> que
// envuelve varios controles confunde al lector de pantalla y al clic.
const Field = ({ label, hint, children, span, group }) => {
    const Tag = group ? 'div' : 'label';
    return (
        <Tag className={`sh-field ${span ? 'sh-field--span' : ''}`} {...(group ? { role: 'group', 'aria-label': label } : {})}>
            <span className="sh-field-label">{label}</span>
            {children}
            {hint && <span className="sh-field-hint">{hint}</span>}
        </Tag>
    );
};

const Toggle = ({ checked, onChange, label, hint }) => (
    <label className="sh-toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="sh-toggle-track" aria-hidden="true"><span /></span>
        <span className="sh-toggle-text">
            <span>{label}</span>
            {hint && <small>{hint}</small>}
        </span>
    </label>
);

const SubHeading = ({ children, action }) => (
    <div className="sh-subheading"><h4>{children}</h4>{action}</div>
);

// Borrador local de una parte de Settings: cada sección solo toca sus campos.
const useDraft = (settings, keys) => {
    const pick = () => Object.fromEntries(keys.map(k => [k, settings?.[k]]));
    const [draft, setDraft] = useState(pick);
    const initial = useMemo(pick, []); // eslint-disable-line react-hooks/exhaustive-deps
    const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
    const set = (patch) => setDraft(d => ({ ...d, ...patch }));
    return { draft, set, dirty };
};

const useSaver = (onSave, onClose) => {
    const [saving, setSaving] = useState(false);
    const save = async (patch) => {
        setSaving(true);
        try { await onSave(patch); onClose(); }
        catch { /* el dashboard ya muestra el toast de error; el pop-up queda abierto */ }
        finally { setSaving(false); }
    };
    return { saving, save };
};

// ─── Secciones ────────────────────────────────────────────────────────────────
const IdentitySheet = ({ settings, onSave, onClose, meta }) => {
    const { draft, set, dirty } = useDraft(settings, ['businessName', 'slogan', 'heroTagline', 'heroSubtitle', 'logoUrl', 'heroImageUrl', 'loginBackgroundUrl']);
    const { saving, save } = useSaver(onSave, onClose);
    const [logoError, setLogoError] = useState('');
    const handleLogo = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setLogoError('');
        try { set({ logoUrl: await readImageAsResizedDataUrl(file, { maxDim: 480 }) }); }
        catch (err) { setLogoError(err.message); }
    };
    return (
        <Sheet {...meta} wide onClose={onClose} onSave={() => save(draft)} saving={saving} dirty={dirty}>
            <div className="sh-grid">
                <Field label="Nombre del negocio" span>
                    <input value={draft.businessName || ''} onChange={e => set({ businessName: e.target.value })} />
                </Field>
                <Field label="Título de la portada" hint="El texto grande de tu página de inicio." span>
                    <input value={draft.slogan || ''} onChange={e => set({ slogan: e.target.value })} />
                </Field>
                <Field label="Frase corta" hint="Va arriba del título, ej. Grooming · Tienda · Paseos">
                    <input value={draft.heroTagline || ''} onChange={e => set({ heroTagline: e.target.value })} />
                </Field>
                <Field label="Subtítulo" hint="Va debajo del título.">
                    <input value={draft.heroSubtitle || ''} onChange={e => set({ heroSubtitle: e.target.value })} />
                </Field>
            </div>

            <SubHeading>Logo</SubHeading>
            <div className="sh-logo-row">
                <div className="sh-logo-frame">
                    {draft.logoUrl ? <img src={draft.logoUrl} alt="Logo actual" /> : <span>Sin logo</span>}
                </div>
                <div className="sh-logo-actions">
                    <label className="sh-btn sh-btn--soft">
                        {draft.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} hidden />
                    </label>
                    {draft.logoUrl && <button type="button" className="sh-btn sh-btn--ghost" onClick={() => set({ logoUrl: null })}>Quitar</button>}
                    <span className="sh-field-hint">PNG con fondo transparente se ve mejor. También sale en el ticket.</span>
                    {logoError && <span className="sh-error">{logoError}</span>}
                </div>
            </div>

            <SubHeading>Imágenes del sitio</SubHeading>
            <div className="sh-grid">
                <Field group label="Portada de inicio" hint="Si no eliges una, se usa la foto de tu giro.">
                    <ImagePicker value={draft.heroImageUrl} onChange={url => set({ heroImageUrl: url })} maxDim={1600} />
                </Field>
                <Field group label="Fondo de inicio de sesión">
                    <ImagePicker value={draft.loginBackgroundUrl} onChange={url => set({ loginBackgroundUrl: url })} maxDim={1600} />
                </Field>
            </div>
        </Sheet>
    );
};

const PALETTES = [
    { name: 'Cielo', primary: '#185FA5', secondary: '#74b9ff' },
    { name: 'Lavanda', primary: '#6c5ce7', secondary: '#a29bfe' },
    { name: 'Menta', primary: '#0f8a6a', secondary: '#55efc4' },
    { name: 'Coral', primary: '#d6455d', secondary: '#ff9f8e' },
    { name: 'Ámbar', primary: '#b45309', secondary: '#fbbf24' },
    { name: 'Grafito', primary: '#1e272e', secondary: '#94a3b8' },
];
const FONT_OPTIONS = [
    { value: 'system', label: 'Predeterminada', sample: 'Aa', family: 'system-ui, sans-serif' },
    { value: 'rounded', label: 'Redondeada', sample: 'Aa', family: "'Quicksand', 'Nunito', sans-serif" },
    { value: 'serif', label: 'Clásica', sample: 'Aa', family: "Georgia, 'Times New Roman', serif" },
    { value: 'mono', label: 'Monoespaciada', sample: 'Aa', family: "ui-monospace, Menlo, monospace" },
];

const ColorsSheet = ({ settings, onSave, onClose, meta }) => {
    const { draft, set, dirty } = useDraft(settings, ['primaryColor', 'secondaryColor', 'fontFamily']);
    const { saving, save } = useSaver(onSave, onClose);
    const primary = draft.primaryColor || '#4f46e5';
    const secondary = draft.secondaryColor || '#a29bfe';
    const font = FONT_OPTIONS.find(f => f.value === (draft.fontFamily || 'system')) || FONT_OPTIONS[0];
    return (
        <Sheet {...meta} wide onClose={onClose} onSave={() => save(draft)} saving={saving} dirty={dirty}>
            <div className="sh-colors">
                <div className="sh-colors-controls">
                    <SubHeading>Combinaciones sugeridas</SubHeading>
                    <div className="sh-palettes">
                        {PALETTES.map(p => {
                            const active = p.primary.toLowerCase() === primary.toLowerCase() && p.secondary.toLowerCase() === secondary.toLowerCase();
                            return (
                                <button type="button" key={p.name} className={`sh-palette ${active ? 'is-active' : ''}`}
                                    onClick={() => set({ primaryColor: p.primary, secondaryColor: p.secondary })} aria-pressed={active}>
                                    <span className="sh-palette-dots"><i style={{ background: p.primary }} /><i style={{ background: p.secondary }} /></span>
                                    <span>{p.name}</span>
                                    {active && <FaCheck aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                    <SubHeading>Colores propios</SubHeading>
                    <div className="sh-grid">
                        <Field group label="Principal" hint="Botones y enlaces.">
                            <span className="sh-color-input">
                                <input type="color" value={primary} onChange={e => set({ primaryColor: e.target.value })} aria-label="Color principal" />
                                <input value={primary} onChange={e => set({ primaryColor: e.target.value })} maxLength={7} spellCheck={false} />
                            </span>
                        </Field>
                        <Field group label="Secundario" hint="Acentos y degradados.">
                            <span className="sh-color-input">
                                <input type="color" value={secondary} onChange={e => set({ secondaryColor: e.target.value })} aria-label="Color secundario" />
                                <input value={secondary} onChange={e => set({ secondaryColor: e.target.value })} maxLength={7} spellCheck={false} />
                            </span>
                        </Field>
                    </div>
                    <SubHeading>Tipografía</SubHeading>
                    <div className="sh-fonts" role="radiogroup" aria-label="Tipografía">
                        {FONT_OPTIONS.map(f => (
                            <button type="button" key={f.value} role="radio" aria-checked={font.value === f.value}
                                className={`sh-font ${font.value === f.value ? 'is-active' : ''}`} onClick={() => set({ fontFamily: f.value })}>
                                <span className="sh-font-sample" style={{ fontFamily: f.family }}>{f.sample}</span>
                                <span>{f.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="sh-colors-preview" aria-label="Vista previa">
                    <span className="sh-preview-label">Vista previa</span>
                    <div className="sh-mock" style={{ fontFamily: font.family }}>
                        <div className="sh-mock-hero" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                            <span className="sh-mock-brand">{settings?.businessName || 'Mi negocio'}</span>
                            <strong>{settings?.slogan || 'Reserva tu cita en minutos'}</strong>
                        </div>
                        <div className="sh-mock-body">
                            <span className="sh-mock-chip" style={{ background: `${secondary}33`, color: primary }}>Servicio popular</span>
                            <p>Baño, corte y arreglo de uñas.</p>
                            <span className="sh-mock-btn" style={{ background: primary }}>Reservar cita</span>
                        </div>
                    </div>
                </div>
            </div>
        </Sheet>
    );
};

const ContactSheet = ({ settings, onSave, onClose, meta }) => {
    const { draft, set, dirty } = useDraft(settings, ['whatsappNumber', 'businessAddress', 'businessMapsUrl', 'instagramUrl', 'facebookUrl', 'tiktokUrl']);
    const { saving, save } = useSaver(onSave, onClose);
    return (
        <Sheet {...meta} onClose={onClose} onSave={() => save(draft)} saving={saving} dirty={dirty}>
            <div className="sh-grid">
                <Field label="WhatsApp" hint="10 dígitos. Es a donde llegan las reservas rápidas.">
                    <input inputMode="tel" value={draft.whatsappNumber || ''} onChange={e => set({ whatsappNumber: e.target.value })} />
                </Field>
                <Field label="Dirección principal">
                    <input value={draft.businessAddress || ''} onChange={e => set({ businessAddress: e.target.value })} />
                </Field>
                <Field label="Liga de Google Maps" span>
                    <input placeholder="https://maps.app.goo.gl/…" value={draft.businessMapsUrl || ''} onChange={e => set({ businessMapsUrl: e.target.value })} />
                </Field>
                <Field label="Instagram"><input placeholder="https://instagram.com/…" value={draft.instagramUrl || ''} onChange={e => set({ instagramUrl: e.target.value })} /></Field>
                <Field label="Facebook"><input placeholder="https://facebook.com/…" value={draft.facebookUrl || ''} onChange={e => set({ facebookUrl: e.target.value })} /></Field>
                <Field label="TikTok"><input placeholder="https://tiktok.com/@…" value={draft.tiktokUrl || ''} onChange={e => set({ tiktokUrl: e.target.value })} /></Field>
            </div>
        </Sheet>
    );
};

// Sucursales: se guardan una por una contra su propio endpoint (no viven en
// Settings), así que este pop-up no tiene un "Guardar" global.
const BranchesSheet = ({ branches, onSaveBranch, onDeleteBranch, onClose, meta, settings }) => {
    const [editing, setEditing] = useState(null); // {…branch} | null
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const startNew = () => setEditing({
        name: branches.length ? '' : 'Sucursal principal',
        address: branches.length ? '' : (settings?.businessAddress || ''),
        phone: branches.length ? '' : (settings?.whatsappNumber || ''),
        mapsUrl: branches.length ? '' : (settings?.businessMapsUrl || ''),
        isMain: branches.length === 0, isActive: true,
    });
    const submit = async () => {
        if (!editing.name?.trim()) { setError('Ponle nombre a la sucursal.'); return; }
        setBusy(true); setError('');
        try { await onSaveBranch(editing); setEditing(null); }
        catch (err) { setError(err.message || 'No se pudo guardar.'); }
        finally { setBusy(false); }
    };
    const act = async (fn) => {
        setBusy(true); setError('');
        try { await fn(); } catch (err) { setError(err.message || 'No se pudo completar.'); } finally { setBusy(false); }
    };

    return (
        <Sheet {...meta} onClose={onClose} footerNote={error ? <span className="sh-error">{error}</span> : `${branches.length} sucursal${branches.length === 1 ? '' : 'es'}`}>
            {!editing && <>
                {branches.length === 0 && (
                    <div className="sh-empty">
                        <FaStore aria-hidden="true" />
                        <p>Todavía no registras sucursales. Agrega la primera — tu página de contacto y los tickets la van a usar.</p>
                    </div>
                )}
                <ul className="sh-branch-list">
                    {branches.map(b => (
                        <li key={b.id} className={`sh-branch ${b.isActive === false ? 'is-off' : ''}`}>
                            <div className="sh-branch-main">
                                <strong>{b.name}{b.isMain && <span className="sh-badge"><FaStar aria-hidden="true" /> Principal</span>}{b.isActive === false && <span className="sh-badge sh-badge--off">Desactivada</span>}</strong>
                                {b.address && <span><FaMapMarkerAlt aria-hidden="true" /> {b.address}</span>}
                                {b.phone && <span><FaPhone aria-hidden="true" /> {b.phone}</span>}
                            </div>
                            <div className="sh-branch-actions">
                                {!b.isMain && b.isActive !== false && <button type="button" className="sh-btn sh-btn--ghost sh-btn--sm" disabled={busy} onClick={() => act(() => onSaveBranch({ id: b.id, isMain: true }))}>Hacer principal</button>}
                                <button type="button" className="sh-btn sh-btn--soft sh-btn--sm" disabled={busy} onClick={() => setEditing({ ...b })}>Editar</button>
                                {!b.isMain && <button type="button" className="sh-icon-btn" disabled={busy} aria-label={`Eliminar ${b.name}`}
                                    onClick={() => { if (window.confirm(`¿Eliminar "${b.name}"? Sus citas y ventas se conservan.`)) act(() => onDeleteBranch(b.id)); }}><FaTrash /></button>}
                            </div>
                        </li>
                    ))}
                </ul>
                <button type="button" className="sh-add" onClick={startNew}><FaPlus aria-hidden="true" /> Agregar sucursal</button>
            </>}
            {editing && (
                <div className="sh-branch-form">
                    <SubHeading>{editing.id ? `Editar ${editing.name || 'sucursal'}` : 'Nueva sucursal'}</SubHeading>
                    <div className="sh-grid">
                        <Field label="Nombre" span><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ej. Sucursal Centro" /></Field>
                        <Field label="Dirección" span><input value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })} /></Field>
                        <Field label="Teléfono"><input inputMode="tel" value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></Field>
                        <Field label="Liga de Google Maps"><input value={editing.mapsUrl} onChange={e => setEditing({ ...editing, mapsUrl: e.target.value })} /></Field>
                    </div>
                    <Toggle checked={!!editing.isMain} onChange={v => setEditing({ ...editing, isMain: v, isActive: v ? true : editing.isActive })}
                        label="Sucursal principal" hint="Se usa por default en citas, ventas y en el ticket." />
                    {!editing.isMain && <Toggle checked={editing.isActive !== false} onChange={v => setEditing({ ...editing, isActive: v })}
                        label="Activa" hint="Las desactivadas no aparecen en tu página ni al cobrar." />}
                    <div className="sh-inline-actions">
                        <button type="button" className="sh-btn sh-btn--ghost" onClick={() => { setEditing(null); setError(''); }}>Cancelar</button>
                        <button type="button" className="sh-btn sh-btn--primary" onClick={submit} disabled={busy}>{busy ? 'Guardando…' : 'Guardar sucursal'}</button>
                    </div>
                </div>
            )}
        </Sheet>
    );
};

// Lista editable genérica (pasos, características, logros, links, campos).
const RowList = ({ items, onChange, empty, addLabel, newItem, render }) => (
    <div className="sh-rows">
        {items.length === 0 && <p className="sh-rows-empty">{empty}</p>}
        {items.map((it, i) => (
            <div key={i} className="sh-row">
                <div className="sh-row-fields">{render(it, (patch) => onChange(items.map((x, idx) => idx === i ? { ...x, ...patch } : x)), i)}</div>
                <button type="button" className="sh-icon-btn" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Quitar"><FaTrash /></button>
            </div>
        ))}
        <button type="button" className="sh-add" onClick={() => onChange([...items, newItem()])}><FaPlus aria-hidden="true" /> {addLabel}</button>
    </div>
);

const HomeContentSheet = ({ settings, onSave, onClose, meta }) => {
    const { draft, set, dirty } = useDraft(settings, ['howItWorksSteps', 'whyUsTitle', 'whyUsSubtitle', 'whyUsFeatures', 'stats']);
    const { saving, save } = useSaver(onSave, onClose);
    const [tab, setTab] = useState('steps');
    const [stepErrors, setStepErrors] = useState({});
    const steps = draft.howItWorksSteps || [];
    const stepImage = async (i, e, update) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setStepErrors(p => ({ ...p, [i]: '' }));
        try { update({ imageUrl: await readImageAsResizedDataUrl(file, { maxDim: 360 }) }); }
        catch (err) { setStepErrors(p => ({ ...p, [i]: err.message })); }
    };
    const TABS = [{ id: 'steps', label: '¿Cómo funciona?' }, { id: 'why', label: '¿Por qué elegirnos?' }, { id: 'stats', label: 'Logros' }];
    return (
        <Sheet {...meta} wide onClose={onClose} onSave={() => save(draft)} saving={saving} dirty={dirty}>
            <div className="sh-tabs" role="tablist">
                {TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`sh-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            {tab === 'steps' && <RowList items={steps} onChange={v => set({ howItWorksSteps: v })}
                empty="Sin pasos. Si lo dejas vacío, esta sección no aparece en tu página."
                addLabel="Agregar paso" newItem={() => ({ icon: '', imageUrl: null, title: '', description: '' })}
                render={(s, update, i) => <>
                    <div className="sh-step-media">
                        {s.imageUrl ? <img src={s.imageUrl} alt="" /> : <input aria-label="Ícono (emoji)" placeholder="Ícono" value={s.icon || ''} onChange={e => update({ icon: e.target.value })} />}
                        <label className="sh-btn sh-btn--soft sh-btn--sm">{s.imageUrl ? 'Cambiar' : 'Imagen'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => stepImage(i, e, update)} /></label>
                        {s.imageUrl && <button type="button" className="sh-btn sh-btn--ghost sh-btn--sm" onClick={() => update({ imageUrl: null })}>Quitar</button>}
                    </div>
                    <div className="sh-row-text">
                        <input placeholder="Título del paso" value={s.title || ''} onChange={e => update({ title: e.target.value })} />
                        <input placeholder="Descripción" value={s.description || ''} onChange={e => update({ description: e.target.value })} />
                        {stepErrors[i] && <span className="sh-error">{stepErrors[i]}</span>}
                    </div>
                </>} />}
            {tab === 'why' && <>
                <div className="sh-grid">
                    <Field label="Título"><input value={draft.whyUsTitle || ''} onChange={e => set({ whyUsTitle: e.target.value })} /></Field>
                    <Field label="Subtítulo"><input value={draft.whyUsSubtitle || ''} onChange={e => set({ whyUsSubtitle: e.target.value })} /></Field>
                </div>
                <RowList items={draft.whyUsFeatures || []} onChange={v => set({ whyUsFeatures: v })}
                    empty="Sin características — agrega las que quieras destacar."
                    addLabel="Agregar característica" newItem={() => ({ icon: '', title: '', desc: '' })}
                    render={(f, update) => <>
                        <input className="sh-input-icon" aria-label="Ícono (emoji)" placeholder="Ícono" value={f.icon || ''} onChange={e => update({ icon: e.target.value })} />
                        <div className="sh-row-text">
                            <input placeholder="Título" value={f.title || ''} onChange={e => update({ title: e.target.value })} />
                            <input placeholder="Descripción" value={f.desc || ''} onChange={e => update({ desc: e.target.value })} />
                        </div>
                    </>} />
            </>}
            {tab === 'stats' && <RowList items={draft.stats || []} onChange={v => set({ stats: v })}
                empty="Sin logros. Agrega solo datos reales de tu negocio."
                addLabel="Agregar logro" newItem={() => ({ icon: '', value: '', label: '' })}
                render={(st, update) => <>
                    <input className="sh-input-icon" aria-label="Ícono (emoji)" placeholder="Ícono" value={st.icon || ''} onChange={e => update({ icon: e.target.value })} />
                    <div className="sh-row-text sh-row-text--inline">
                        <input placeholder="Valor (ej. 500+)" value={st.value || ''} onChange={e => update({ value: e.target.value })} />
                        <input placeholder="Etiqueta (ej. Clientes atendidos)" value={st.label || ''} onChange={e => update({ label: e.target.value })} />
                    </div>
                </>} />}
        </Sheet>
    );
};

const FooterSheet = ({ settings, onSave, onClose, meta }) => {
    const { draft, set, dirty } = useDraft(settings, ['footerLinks']);
    const { saving, save } = useSaver(onSave, onClose);
    return (
        <Sheet {...meta} onClose={onClose} onSave={() => save(draft)} saving={saving} dirty={dirty}>
            <RowList items={draft.footerLinks || []} onChange={v => set({ footerLinks: v })}
                empty="Sin links extra en el pie de página."
                addLabel="Agregar link" newItem={() => ({ label: '', url: '' })}
                render={(l, update) => <div className="sh-row-text sh-row-text--inline">
                    <input placeholder="Texto" value={l.label || ''} onChange={e => update({ label: e.target.value })} />
                    <input placeholder="https://… o /ruta" value={l.url || ''} onChange={e => update({ url: e.target.value })} />
                </div>} />
        </Sheet>
    );
};

const SAMPLE_SALE = {
    id: 1024, paymentMethod: 'efectivo', status: 'pagado', total: 731,
    items: [
        { name: 'Baño y corte · Mediano', quantity: 1, price: 450 },
        { name: 'Shampoo hipoalergénico', quantity: 2, price: 156 },
        { name: 'Descuento (5%)', quantity: 1, price: -31 },
    ],
};

const TicketSheet = ({ settings, branches, onSave, onClose, meta }) => {
    const initial = useMemo(() => resolveTicketConfig(settings), [settings]);
    const [cfg, setCfg] = useState(initial);
    const { saving, save } = useSaver(onSave, onClose);
    const dirty = JSON.stringify(cfg) !== JSON.stringify(initial);
    const set = (patch) => setCfg(c => ({ ...c, ...patch }));
    const mainBranch = branches.find(b => b.isMain) || branches[0];
    const SHOW = [
        ['showLogo', 'Logo'], ['showBranch', 'Nombre de la sucursal'], ['showAddress', 'Dirección'], ['showPhone', 'Teléfono'],
        ['showFolio', 'Folio'], ['showDate', 'Fecha y hora'], ['showClient', 'Cliente'], ['showCashier', 'Quién atendió'],
        ['showPaymentMethod', 'Forma de pago'],
    ];
    return (
        <Sheet {...meta} wide onClose={onClose} onSave={() => save({ ticketConfig: cfg })} saving={saving} dirty={dirty}>
            <div className="sh-ticket">
                <div className="sh-ticket-controls">
                    <SubHeading>Papel</SubHeading>
                    <div className="sh-segment" role="radiogroup" aria-label="Ancho del papel">
                        {PAPER_OPTIONS.map(p => (
                            <button type="button" key={p.value} role="radio" aria-checked={cfg.paperWidth === p.value}
                                className={`sh-segment-btn ${cfg.paperWidth === p.value ? 'is-active' : ''}`} onClick={() => set({ paperWidth: p.value })}>
                                <strong>{p.label}</strong><small>{p.hint}</small>
                            </button>
                        ))}
                    </div>
                    <Field label="Tamaño de letra">
                        <select value={cfg.fontSize} onChange={e => set({ fontSize: e.target.value })}>
                            <option value="compacta">Compacta</option>
                            <option value="normal">Normal</option>
                            <option value="grande">Grande</option>
                        </select>
                    </Field>

                    <SubHeading>Encabezado</SubHeading>
                    <Field label="Título" hint="Vacío = nombre del negocio.">
                        <input value={cfg.title} placeholder={settings?.businessName || 'Mi negocio'} onChange={e => set({ title: e.target.value })} />
                    </Field>
                    <Field label="Líneas extra" hint="Una por renglón: razón social, RFC, régimen fiscal…">
                        <textarea rows={3} value={cfg.headerLines} onChange={e => set({ headerLines: e.target.value })} />
                    </Field>

                    <SubHeading>Qué mostrar</SubHeading>
                    <div className="sh-checks">
                        {SHOW.map(([k, label]) => (
                            <label key={k} className={`sh-check ${cfg[k] ? 'is-on' : ''}`}>
                                <input type="checkbox" checked={!!cfg[k]} onChange={e => set({ [k]: e.target.checked })} />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>

                    <SubHeading>Pie</SubHeading>
                    <Field label="Mensaje">
                        <input value={cfg.footerMessage} onChange={e => set({ footerMessage: e.target.value })} />
                    </Field>
                    <Field label="Leyenda" hint="Texto chico al final, ej. «Este ticket no es un comprobante fiscal».">
                        <textarea rows={2} value={cfg.legalText} onChange={e => set({ legalText: e.target.value })} />
                    </Field>
                    <Toggle checked={!!cfg.autoPrint} onChange={v => set({ autoPrint: v })}
                        label="Abrir el diálogo de impresión al generar el ticket" />
                    <button type="button" className="sh-link" onClick={() => setCfg({ ...DEFAULT_TICKET_CONFIG })}>Restablecer formato original</button>
                </div>
                <div className="sh-ticket-preview">
                    <span className="sh-preview-label">Vista previa · ticket de ejemplo</span>
                    <div className="sh-ticket-stage">
                        <TicketPreview sale={SAMPLE_SALE} settings={{ ...settings, ticketConfig: cfg }} branch={mainBranch} cashierName="Ana" />
                    </div>
                </div>
            </div>
        </Sheet>
    );
};

const FeaturesSheet = ({ settings, onSave, onClose, meta }) => {
    const { draft, set, dirty } = useDraft(settings, ['enablePets', 'enableStaffSelection', 'enableMemberships', 'enableClientNotes', 'enableTableReservations', 'allowGuestBooking', 'clientExtraFields']);
    const { saving, save } = useSaver(onSave, onClose);
    return (
        <Sheet {...meta} onClose={onClose} onSave={() => save(draft)} saving={saving} dirty={dirty}>
            <div className="sh-toggles">
                <Toggle checked={draft.enablePets !== false} onChange={v => set({ enablePets: v })} label="Maneja mascotas" hint='Muestra la sección "Pacientes" y el registro de mascotas.' />
                <Toggle checked={draft.allowGuestBooking !== false} onChange={v => set({ allowGuestBooking: v })} label="Reserva rápida sin cuenta" hint="Tus clientes pueden pedir cita solo con nombre y WhatsApp." />
                <Toggle checked={!!draft.enableStaffSelection} onChange={v => set({ enableStaffSelection: v })} label="Elegir quién atiende al reservar" />
                <Toggle checked={!!draft.enableMemberships} onChange={v => set({ enableMemberships: v })} label="Membresías" hint="Mensualidades con vigencia (gimnasios, estudios)." />
                <Toggle checked={!!draft.enableClientNotes} onChange={v => set({ enableClientNotes: v })} label="Expediente por cliente" hint="Notas por consulta (clínicas)." />
                <Toggle checked={!!draft.enableTableReservations} onChange={v => set({ enableTableReservations: v })} label="Reservar mesa" hint="En vez de solo servicio en mostrador." />
            </div>
            <SubHeading>Campos extra al registrar un cliente</SubHeading>
            <RowList items={draft.clientExtraFields || []} onChange={v => set({ clientExtraFields: v })}
                empty="Sin campos extra."
                addLabel="Agregar campo" newItem={() => ({ key: '', label: '', required: false })}
                render={(f, update) => <div className="sh-row-text sh-row-text--inline">
                    <input placeholder="Etiqueta visible (ej. Alergias)" value={f.label || ''}
                        onChange={e => update({ label: e.target.value, ...(!f.key || f.key === slug(f.label) ? { key: slug(e.target.value) } : {}) })} />
                    <label className="sh-mini-check"><input type="checkbox" checked={!!f.required} onChange={e => update({ required: e.target.checked })} /> Requerido</label>
                </div>} />
        </Sheet>
    );
};
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const defaultHours = () => DAY_LABELS.map((_, day) => ({ day, open: true, start: '10:15', end: '17:00' }));
const HoursSheet = ({ settings, onSave, onClose, meta }) => {
    const initial = useMemo(() => (settings?.businessHours?.length === 7 ? settings.businessHours : defaultHours()), [settings]);
    const [hours, setHours] = useState(initial);
    const { saving, save } = useSaver(onSave, onClose);
    const dirty = JSON.stringify(hours) !== JSON.stringify(initial);
    const update = (day, patch) => setHours(h => h.map(d => d.day === day ? { ...d, ...patch } : d));
    const copyToAll = (src) => setHours(h => h.map(d => ({ ...d, open: src.open, start: src.start, end: src.end })));
    // Lunes primero, como se lee una semana de trabajo.
    const ordered = [1, 2, 3, 4, 5, 6, 0].map(i => hours.find(d => d.day === i)).filter(Boolean);
    return (
        <Sheet {...meta} onClose={onClose} onSave={() => save({ businessHours: hours })} saving={saving} dirty={dirty}>
            <p className="sh-lead">Con esto se arman los horarios disponibles para agendar, según la duración de cada servicio.</p>
            <ul className="sh-hours">
                {ordered.map(d => (
                    <li key={d.day} className={d.open ? '' : 'is-closed'}>
                        <Toggle checked={d.open} onChange={v => update(d.day, { open: v })} label={DAY_LABELS[d.day]} />
                        {d.open ? (
                            <span className="sh-hours-range">
                                <input type="time" value={d.start} onChange={e => update(d.day, { start: e.target.value })} aria-label={`Abre ${DAY_LABELS[d.day]}`} />
                                <span>a</span>
                                <input type="time" value={d.end} onChange={e => update(d.day, { end: e.target.value })} aria-label={`Cierra ${DAY_LABELS[d.day]}`} />
                                <button type="button" className="sh-link" onClick={() => copyToAll(d)}>Copiar a todos</button>
                            </span>
                        ) : <span className="sh-hours-closed">Cerrado</span>}
                    </li>
                ))}
            </ul>
        </Sheet>
    );
};

// ─── Resúmenes de cada tarjeta ────────────────────────────────────────────────
const hoursSummary = (hours) => {
    if (!hours?.length) return 'Sin definir';
    const open = hours.filter(d => d.open);
    if (!open.length) return 'Cerrado toda la semana';
    const same = open.every(d => d.start === open[0].start && d.end === open[0].end);
    const days = `${open.length} día${open.length === 1 ? '' : 's'}`;
    return same ? `${days} · ${open[0].start}–${open[0].end}` : `${days} · horario variable`;
};

const SECTIONS = [
    {
        group: 'Tu marca',
        items: [
            { id: 'identity', icon: <FaFingerprint />, title: 'Identidad', description: 'Nombre, títulos, logo e imágenes de tu página.', Sheet: IdentitySheet, tone: 'blue' },
            { id: 'colors', icon: <FaPalette />, title: 'Colores y tipografía', description: 'La paleta y la letra con que se ve tu negocio.', Sheet: ColorsSheet, tone: 'lavender' },
        ],
    },
    {
        group: 'Tu página',
        items: [
            { id: 'home', icon: <FaHome />, title: 'Contenido de inicio', description: '¿Cómo funciona?, ¿por qué elegirnos? y logros.', Sheet: HomeContentSheet, tone: 'mint' },
            { id: 'contact', icon: <FaAddressBook />, title: 'Contacto y redes', description: 'WhatsApp, dirección y redes sociales.', Sheet: ContactSheet, tone: 'blue' },
            { id: 'footer', icon: <FaLink />, title: 'Pie de página', description: 'Links extra al final de tu página.', Sheet: FooterSheet, tone: 'slate' },
        ],
    },
    {
        group: 'Operación',
        items: [
            { id: 'branches', icon: <FaStore />, title: 'Sucursales', description: 'Tus locales: dirección, teléfono y cuál es la principal.', Sheet: BranchesSheet, tone: 'amber' },
            { id: 'hours', icon: <FaClock />, title: 'Horarios', description: 'Días y horas en que atiendes.', Sheet: HoursSheet, tone: 'mint' },
            { id: 'ticket', icon: <FaReceipt />, title: 'Ticket de venta', description: 'Formato del ticket que imprime el punto de venta.', Sheet: TicketSheet, tone: 'slate' },
            { id: 'features', icon: <FaSlidersH />, title: 'Giro y funciones', description: 'Qué herramientas usa tu tipo de negocio.', Sheet: FeaturesSheet, tone: 'lavender' },
        ],
    },
];

const CardPreview = ({ id, settings, branches }) => {
    switch (id) {
        case 'identity':
            return (
                <span className="sh-pv-identity">
                    <span className="sh-pv-logo">{settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : (settings.businessName || '?')[0]}</span>
                    <span className="sh-pv-lines"><strong>{settings.businessName || 'Sin nombre'}</strong><small>{settings.slogan || 'Sin título de portada'}</small></span>
                </span>
            );
        case 'colors':
            return (
                <span className="sh-pv-colors">
                    <i style={{ background: settings.primaryColor || '#4f46e5' }} />
                    <i style={{ background: settings.secondaryColor || '#a29bfe' }} />
                    <small>{(FONT_OPTIONS.find(f => f.value === (settings.fontFamily || 'system')) || FONT_OPTIONS[0]).label}</small>
                </span>
            );
        case 'branches': {
            const active = branches.filter(b => b.isActive !== false);
            const main = branches.find(b => b.isMain);
            return <span className="sh-pv-text"><strong>{active.length || 'Sin'} activa{active.length === 1 ? '' : 's'}</strong>{main && <small>Principal: {main.name}</small>}</span>;
        }
        case 'hours':
            return <span className="sh-pv-text"><strong>{hoursSummary(settings.businessHours)}</strong></span>;
        case 'ticket': {
            const c = resolveTicketConfig(settings);
            return <span className="sh-pv-text"><strong>Rollo de {c.paperWidth} mm</strong><small>{c.showLogo && settings.logoUrl ? 'Con logo' : 'Sin logo'} · letra {c.fontSize}</small></span>;
        }
        case 'contact':
            return <span className="sh-pv-text"><strong>{settings.whatsappNumber || 'Sin WhatsApp'}</strong><small>{[settings.instagramUrl, settings.facebookUrl, settings.tiktokUrl].filter(Boolean).length} red(es) social(es)</small></span>;
        case 'home': {
            const n = (settings.howItWorksSteps || []).length;
            return <span className="sh-pv-text"><strong>{n} paso{n === 1 ? '' : 's'}</strong><small>{(settings.whyUsFeatures || []).length} características · {(settings.stats || []).length} logros</small></span>;
        }
        case 'footer':
            return <span className="sh-pv-text"><strong>{(settings.footerLinks || []).length} link(s)</strong></span>;
        case 'features': {
            const on = ['enablePets', 'enableStaffSelection', 'enableMemberships', 'enableClientNotes', 'enableTableReservations']
                .filter(k => (k === 'enablePets' ? settings[k] !== false : !!settings[k])).length;
            return <span className="sh-pv-text"><strong>{on} función(es) activa(s)</strong><small>Giro: {settings.giro || '—'}</small></span>;
        }
        default: return null;
    }
};

// ─── Hub ──────────────────────────────────────────────────────────────────────
export const SettingsHub = ({ settings, branches = [], onSave, onSaveBranch, onDeleteBranch, onOpenBranches }) => {
    const [open, setOpen] = useState(null);
    if (!settings) return <p className="empty-td">Cargando configuración...</p>;

    // Cada pop-up manda solo sus campos; se combinan con lo actual para que
    // el PUT de Settings (que recibe el registro completo) no pise nada.
    const saveSection = (patch) => onSave({ ...settings, ...patch });
    const current = SECTIONS.flatMap(g => g.items).find(s => s.id === open);
    const openSection = (id) => {
        if (id === 'branches') onOpenBranches?.();
        setOpen(id);
    };

    return (
        <div className="sh-hub">
            {SECTIONS.map(group => (
                <section key={group.group} className="sh-group" aria-labelledby={`sh-g-${group.group}`}>
                    <h3 id={`sh-g-${group.group}`} className="sh-group-title">{group.group}</h3>
                    <div className="sh-cards">
                        {group.items.map(item => (
                            <button key={item.id} type="button" className={`sh-card sh-card--${item.tone}`} onClick={() => openSection(item.id)}>
                                <span className="sh-card-top">
                                    <span className="sh-card-icon" aria-hidden="true">{item.icon}</span>
                                    <FaChevronRight className="sh-card-chevron" aria-hidden="true" />
                                </span>
                                <span className="sh-card-title">{item.title}</span>
                                <span className="sh-card-desc">{item.description}</span>
                                <span className="sh-card-preview"><CardPreview id={item.id} settings={settings} branches={branches} /></span>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
            {current && (
                <current.Sheet
                    meta={{ title: current.title, description: current.description, icon: current.icon }}
                    settings={settings} branches={branches}
                    onSave={saveSection} onSaveBranch={onSaveBranch} onDeleteBranch={onDeleteBranch}
                    onClose={() => setOpen(null)}
                />
            )}
        </div>
    );
};

export default SettingsHub;
