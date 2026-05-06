// src/components/Register/Register.jsx
// CAMBIOS según feedback del cliente:
// 1. Validación WhatsApp en el campo teléfono (10 dígitos exactos)
// 2. Raza ahora es texto libre (no dropdown) — "que el cliente escriba la raza
//    porque luego ni ellos saben qué raza escoger"
// 3. Campo peso ahora se llama "Peso aproximado" con nota aclaratoria
// 4. petData se pasa correctamente a register() como 2do argumento

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';
import loginVideo  from '../../assets/hero.mp4';
import loginPoster from '../../assets/1.jpg';
import { useAuth } from '../../contexts/AuthContext';
import { formatMexPhone, whatsAppValidationError } from '../../utils/formatPhone';

const Register = () => {
    const [step, setStep] = useState(1);
    const [clientData, setClientData] = useState({
        name: '', phone: '', email: '', password: '', confirmPassword: ''
    });
    const [petData, setPetData] = useState({
        petName: '', species: 'perro', breed: '', age: '', weight: '', notes: ''
    });
    const [error,   setError]   = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    // Handler genérico para datos del cliente
    const handleClientChange = (e) => {
        setClientData({ ...clientData, [e.target.id]: e.target.value });
    };

    // Handler especial para teléfono (formatea + valida WhatsApp en tiempo real)
    const handlePhoneChange = (e) => {
        const formatted = formatMexPhone(e.target.value);
        setClientData(prev => ({ ...prev, phone: formatted }));
        // Validación en vivo, pero solo mostrar error si hay algo escrito
        if (formatted.length > 0) {
            setPhoneError(whatsAppValidationError(formatted));
        } else {
            setPhoneError('');
        }
    };

    const handlePetChange = (e) =>
        setPetData({ ...petData, [e.target.id]: e.target.value });

    // ── Paso 1 → 2 ───────────────────────────────────────────────────────────
    const handleNext = (e) => {
        e.preventDefault();
        setError('');

        // Validación de WhatsApp
        const waErr = whatsAppValidationError(clientData.phone);
        if (waErr) {
            setPhoneError(waErr);
            setError('El número debe ser de WhatsApp válido (10 dígitos).');
            return;
        }

        if (clientData.password !== clientData.confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (clientData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        setStep(2);
    };

    // ── Submit final ─────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Pasar petData como 2do argumento — AuthContext.register lo crea
            const newUser = await register(clientData, petData);
            if (newUser) navigate('/');
            else setError('Error en el registro. Intenta de nuevo.');
        } catch (err) {
            setError(err.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 1: datos del dueño ───────────────────────────────────────────────
    const renderStep1 = () => (
        <form onSubmit={handleNext}>
            <div className="input-group">
                <label>Nombre completo</label>
                <input type="text" id="name" placeholder="Juan Pérez"
                    value={clientData.name}
                    onChange={handleClientChange} required />
            </div>
            <div className="input-group">
                <label>WhatsApp (10 dígitos) 📱</label>
                <input
                    type="tel"
                    id="phone"
                    placeholder="228 304 5591"
                    value={clientData.phone}
                    onChange={handlePhoneChange}
                    inputMode="numeric"
                    required
                />
                {phoneError && (
                    <small className="field-hint field-hint--error">{phoneError}</small>
                )}
                {!phoneError && clientData.phone && (
                    <small className="field-hint field-hint--ok">✓ Número válido para WhatsApp</small>
                )}
            </div>
            <div className="input-group">
                <label>Email</label>
                <input type="email" id="email" placeholder="tu@email.com"
                    value={clientData.email}
                    onChange={handleClientChange} required />
            </div>
            <div className="row-group">
                <div className="input-group">
                    <label>Contraseña</label>
                    <input type="password" id="password" placeholder="••••••••"
                        value={clientData.password}
                        onChange={handleClientChange} required />
                </div>
                <div className="input-group">
                    <label>Confirmar</label>
                    <input type="password" id="confirmPassword" placeholder="••••••••"
                        value={clientData.confirmPassword}
                        onChange={handleClientChange} required />
                </div>
            </div>
            <button type="submit" className="register-button primary">
                Siguiente →
            </button>
        </form>
    );

    // ── Step 2: datos de la mascota ───────────────────────────────────────────
    // Cambios: raza ahora es input de texto libre, peso ahora es "Peso aproximado"
    const renderStep2 = () => (
        <form onSubmit={handleSubmit}>
            <div className="input-group">
                <label>Nombre de tu mascota</label>
                <input type="text" id="petName" placeholder="Firulais"
                    value={petData.petName}
                    onChange={handlePetChange} required />
            </div>
            <div className="input-group">
                <label>Especie</label>
                <select id="species" value={petData.species} onChange={handlePetChange}>
                    <option value="perro">🐶 Perro</option>
                    <option value="gato">🐱 Gato</option>
                    <option value="ave">🦜 Ave</option>
                    <option value="otro">🐾 Otro</option>
                </select>
            </div>
            <div className="input-group">
                <label>Raza</label>
                <input
                    type="text"
                    id="breed"
                    placeholder="Ej: Poodle, Mestizo, Pastor Australiano..."
                    value={petData.breed}
                    onChange={handlePetChange}
                />
                <small className="field-hint">
                    Si no estás seguro/a, puedes dejarlo en blanco o escribir "mestizo".
                    Podrás corregirlo más adelante.
                </small>
            </div>
            <div className="row-group">
                <div className="input-group">
                    <label>Edad (años)</label>
                    <input type="number" id="age" min="0" max="30" placeholder="2"
                        value={petData.age}
                        onChange={handlePetChange} />
                </div>
                <div className="input-group">
                    <label>Peso aproximado (kg)</label>
                    <input type="number" id="weight" min="0" step="0.1" placeholder="10"
                        value={petData.weight}
                        onChange={handlePetChange} />
                </div>
            </div>
            <small className="field-hint field-hint--info">
                ℹ️ El peso se verificará en la sucursal con báscula al momento del servicio.
            </small>
            <div className="input-group" style={{ marginTop: 12 }}>
                <label>Notas (alergias, condiciones)</label>
                <textarea id="notes" rows="2" placeholder="Ej: alergia al pollo, muy nervioso..."
                    value={petData.notes}
                    onChange={handlePetChange} />
            </div>
            <div className="register-actions">
                <button type="button" className="register-button secondary"
                    onClick={() => setStep(1)}>
                    ← Volver
                </button>
                <button type="submit" className="register-button primary"
                    disabled={loading}>
                    {loading ? 'Registrando...' : 'Crear cuenta'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="register-container">

            {/* ── Video de fondo full-screen ── */}
            <video
                className="register-video-bg"
                autoPlay muted loop playsInline
                poster={loginPoster}
            >
                <source src={loginVideo} type="video/mp4" />
            </video>

            {/* ── Overlay ── */}
            <div className="register-overlay" />

            {/* ── Card ── */}
            <div className="register-card">

                {/* Logo */}
                <div className="register-logo">🐾</div>
                <h2>Crear cuenta</h2>

                {/* Stepper */}
                <div className="step-indicator">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-circle">1</div>
                        <span>Tus datos</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        <div className="step-circle">2</div>
                        <span>Tu mascota</span>
                    </div>
                </div>

                {/* Error */}
                {error && <div className="error-message">{error}</div>}

                {/* Formulario por paso */}
                {step === 1 ? renderStep1() : renderStep2()}

                {/* Footer */}
                <div className="register-footer">
                    <p>¿Ya tienes cuenta? <Link to="/acceso">Inicia sesión</Link></p>
                    <Link to="/" className="register-back">← Volver al inicio</Link>
                </div>

            </div>
        </div>
    );
};

export default Register;