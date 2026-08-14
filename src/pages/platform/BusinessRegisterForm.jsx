// src/pages/platform/BusinessRegisterForm.jsx
//
// Alta de negocio 100% self-service — nace directo en modo AEGIS. Al
// terminar muestra la contraseña temporal del primer administrador (mismo
// patrón que el registro de clientes en negocios AEGIS) y lo deja logueado
// directo en su panel.
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { businessApi } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { GIRO_PRESETS, GIRO_OPTIONS, getGiroUrlLabel } from '../../config/giroPresets';
import { readImageAsResizedDataUrl } from '../../utils/imageUpload';
import './BusinessRegisterForm.css';

const slugify = (text) =>
    String(text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const BusinessRegisterForm = () => {
    const { establishSession } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // Llega preseleccionado desde una landing de giro (/uñas → "Registra tu
    // negocio" → /crear-negocio?giro=unas) — si el valor no es un giro
    // real, se ignora en vez de dejar el <select> en un valor inválido.
    const giroFromQuery = searchParams.get('giro');
    const initialGiro = (giroFromQuery && GIRO_PRESETS[giroFromQuery]) ? giroFromQuery : (GIRO_OPTIONS[0]?.value || 'mascotas');

    const [businessName, setBusinessName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
    const [giro, setGiro] = useState(initialGiro);
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [logoError, setLogoError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { slug, tempPassword }

    const checkTimer = useRef(null);

    // El slug se auto-sugiere del nombre del negocio hasta que la persona lo
    // edite a mano — después de eso, ya no lo tocamos automáticamente.
    useEffect(() => {
        if (!slugTouched) setSlug(slugify(businessName));
    }, [businessName, slugTouched]);

    useEffect(() => {
        if (!slug) { setSlugStatus(null); return; }
        setSlugStatus('checking');
        clearTimeout(checkTimer.current);
        checkTimer.current = setTimeout(async () => {
            try {
                const { available } = await businessApi.checkSlug(slug);
                setSlugStatus(available ? 'available' : 'taken');
            } catch {
                setSlugStatus(null);
            }
        }, 400);
        return () => clearTimeout(checkTimer.current);
    }, [slug]);

    const handleLogoFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setLogoError('');
        try {
            const dataUrl = await readImageAsResizedDataUrl(file, { maxDim: 480 });
            setLogoUrl(dataUrl);
        } catch (err) {
            setLogoError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (slugStatus === 'taken') {
            setError('Ese identificador de URL ya está en uso — elige otro.');
            return;
        }
        if (!logoUrl) {
            setError('Sube el logo de tu negocio antes de continuar.');
            return;
        }
        setLoading(true);
        try {
            const data = await businessApi.register({ businessName, slug, giro, adminName, adminEmail, logoUrl });
            establishSession(data.token, data.user);
            setResult({ slug: data.slug, tempPassword: data.tempPassword });
        } catch (err) {
            setError(err.message || 'No se pudo crear tu negocio. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="brf-page">
                <div className="brf-card">
                    <div className="brf-icon">🎉</div>
                    <h2>¡Tu negocio ya existe en Emporio!</h2>
                    <p>Tu cuenta de administrador se creó con una contraseña temporal:</p>
                    <p className="brf-temp-password">{result.tempPassword}</p>
                    <p className="brf-hint">
                        Guárdala — el sistema te va a pedir cambiarla por la tuya en cuanto entres.
                        Tu página pública ya está lista en <strong>/{getGiroUrlLabel(giro)}/{result.slug}</strong>.
                    </p>
                    <button className="brf-submit" onClick={() => navigate('/admin-dashboard')}>
                        Ir a mi panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="brf-page">
            <div className="brf-card">
                <Link to="/" className="brf-back">← Emporio</Link>
                <h2>Registra tu negocio</h2>
                <p className="brf-subtitle">Gratis mientras estamos en pruebas.</p>
                <form onSubmit={handleSubmit}>
                    {error && <div className="brf-error">{error}</div>}

                    <div className="brf-field">
                        <label>Nombre de tu negocio</label>
                        <input
                            type="text" value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Ej: Taylor's Pet Services" required
                        />
                    </div>

                    <div className="brf-field">
                        <label>Tu URL en Emporio</label>
                        <div className="brf-slug-row">
                            <span>/{getGiroUrlLabel(giro)}/</span>
                            <input
                                type="text" value={slug}
                                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                                placeholder="tu-negocio" required
                            />
                        </div>
                        {slugStatus === 'checking' && <small className="brf-hint">Comprobando disponibilidad...</small>}
                        {slugStatus === 'available' && <small className="brf-hint brf-hint--ok">✓ Disponible</small>}
                        {slugStatus === 'taken' && <small className="brf-hint brf-hint--error">Ya está en uso, prueba otro</small>}
                    </div>

                    <div className="brf-field">
                        <label>Giro de tu negocio</label>
                        <select value={giro} onChange={(e) => setGiro(e.target.value)}>
                            {GIRO_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </div>

                    <div className="brf-field">
                        <label>Tu nombre</label>
                        <input
                            type="text" value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            placeholder="Tu nombre completo" required
                        />
                    </div>

                    <div className="brf-field">
                        <label>Tu correo</label>
                        <input
                            type="email" value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="tu@correo.com" required
                        />
                    </div>

                    <div className="brf-field">
                        <label>Logo de tu negocio</label>
                        {logoUrl ? (
                            <div className="brf-logo-preview-row">
                                <img src={logoUrl} alt="Logo" className="brf-logo-preview" />
                                <label className="brf-logo-btn">
                                    Cambiar
                                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFile} hidden />
                                </label>
                            </div>
                        ) : (
                            <label className="brf-logo-btn brf-logo-btn--empty">
                                Subir logo
                                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFile} hidden />
                            </label>
                        )}
                        {logoError && <small className="brf-hint brf-hint--error">{logoError}</small>}
                        <small className="brf-hint">Aparece en tu página pública y en tu panel — obligatorio.</small>
                    </div>

                    <button type="submit" className="brf-submit" disabled={loading || slugStatus === 'taken'}>
                        {loading ? 'Creando...' : 'Crear mi negocio'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BusinessRegisterForm;
