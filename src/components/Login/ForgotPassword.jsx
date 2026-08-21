// src/components/Login/ForgotPassword.jsx
//
// Recuperación 100% interna, sin SMTP: el propio sistema verifica la
// identidad del usuario con la pregunta de seguridad elegida al registrarse,
// y solo entonces permite fijar una nueva contraseña — en un único flujo de
// 3 pasos, sin depender de un correo que nunca se envía.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';
import loginVideo from '../../assets/login.mp4';
import loginPoster from '../../assets/1.jpg';
import { authApi } from '../../api/apiClient';
import { useBusinessPath } from '../../utils/businessPath';

const ForgotPassword = () => {
    // Multi-tenant: vive bajo /:giro/:businessSlug/olvide-contrasena.
    const { withBusinessPath } = useBusinessPath();
    const accesoPath = withBusinessPath('/acceso');
    const [step, setStep] = useState(1); // 1=email 2=pregunta 3=nueva contraseña 4=listo
    const [email, setEmail] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // AEGIS nunca acepta una contraseña elegida por la persona — siempre
    // genera la suya. Bug real que esto reemplaza: antes el paso 3 pedía
    // una contraseña nueva SIN IMPORTAR el negocio, y ese valor se
    // guardaba en un campo local que el login AEGIS ni siquiera lee — el
    // restablecimiento "funcionaba" pero no arreglaba nada.
    const [aegisMode, setAegisMode] = useState(false);
    const [tempPassword, setTempPassword] = useState('');

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { hasQuestion, question: q } = await authApi.securityQuestion(email);
            if (!hasQuestion) {
                setError('No encontramos una pregunta de seguridad para este correo. Si tu cuenta es anterior a esta función, o no la configuraste, contacta a un administrador para restablecer tu contraseña.');
                return;
            }
            setQuestion(q);
            setStep(2);
        } catch (err) {
            setError(err.message || 'No se pudo procesar la solicitud. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { resetToken: t, authProvider } = await authApi.verifyAnswer(email, answer);
            setResetToken(t);
            setAegisMode(authProvider === 'aegis');
            setStep(3);
        } catch (err) {
            setError(err.message || 'Respuesta incorrecta. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
        if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');

        setLoading(true);
        try {
            await authApi.resetPassword(resetToken, password);
            setStep(4);
        } catch (err) {
            setError(err.message || 'El proceso expiró. Empieza de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Modo AEGIS: no hay contraseña que elegir, solo confirmar — el sistema
    // genera una temporal y la muestra una vez (mismo patrón que el alta de
    // negocio y la creación de personal).
    const handleAegisReset = async () => {
        setError('');
        setLoading(true);
        try {
            const { tempPassword: t } = await authApi.resetPassword(resetToken);
            setTempPassword(t);
            setStep(4);
        } catch (err) {
            setError(err.message || 'El proceso expiró. Empieza de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <video className="login-video-bg" autoPlay muted loop playsInline poster={loginPoster}>
                <source src={loginVideo} type="video/mp4" />
            </video>
            <div className="login-overlay" />

            <div className="login-card">
                <div className="login-logo">🐾</div>
                <h2>Recuperar contraseña</h2>

                {step === 1 && (
                    <>
                        <p className="login-subtitle">Ingresa tu email para verificar tu identidad con tu pregunta de seguridad.</p>
                        <form onSubmit={handleEmailSubmit}>
                            {error && <div className="error-message">{error}</div>}
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required
                                />
                            </div>
                            <button type="submit" className="login-button" disabled={loading}>
                                {loading ? 'Buscando...' : 'Continuar'}
                            </button>
                        </form>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p className="login-subtitle">Responde tu pregunta de seguridad.</p>
                        <form onSubmit={handleAnswerSubmit}>
                            {error && <div className="error-message">{error}</div>}
                            <div className="input-group">
                                <label>{question}</label>
                                <input
                                    type="text"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Tu respuesta"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="login-button" disabled={loading}>
                                {loading ? 'Verificando...' : 'Verificar'}
                            </button>
                        </form>
                    </>
                )}

                {step === 3 && aegisMode && (
                    <>
                        <p className="login-subtitle">Identidad verificada. Este negocio genera contraseñas temporales seguras automáticamente — no eliges una tú.</p>
                        {error && <div className="error-message">{error}</div>}
                        <button type="button" className="login-button" onClick={handleAegisReset} disabled={loading}>
                            {loading ? 'Generando...' : 'Generar contraseña temporal'}
                        </button>
                    </>
                )}

                {step === 3 && !aegisMode && (
                    <>
                        <p className="login-subtitle">Identidad verificada. Elige tu nueva contraseña.</p>
                        <form onSubmit={handlePasswordSubmit}>
                            {error && <div className="error-message">{error}</div>}
                            <div className="input-group">
                                <label>Nueva contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Confirmar contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button type="submit" className="login-button" disabled={loading}>
                                {loading ? 'Guardando...' : 'Restablecer contraseña'}
                            </button>
                        </form>
                    </>
                )}

                {step === 4 && aegisMode && (
                    <>
                        <p className="login-subtitle">Tu contraseña temporal es:</p>
                        <div className="login-temp-password">{tempPassword}</div>
                        <p className="login-subtitle">Guárdala ahora — no volverá a mostrarse. Úsala para iniciar sesión.</p>
                    </>
                )}

                {step === 4 && !aegisMode && (
                    <p className="login-subtitle">¡Contraseña actualizada! Ya puedes iniciar sesión con tu nueva contraseña.</p>
                )}

                <div className="login-footer">
                    <p><Link to={accesoPath}>← Volver a iniciar sesión</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
