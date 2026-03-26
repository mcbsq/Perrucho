// src/components/Register/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';
import loginVideo  from '../../assets/hero.mp4'; // ← mismo video o uno distinto
import loginPoster from '../../assets/1.jpg';    // fallback mientras carga
import { useAuth } from '../../contexts/AuthContext';

const commonBreeds = [
    'Labrador Retriever', 'Golden Retriever', 'German Shepherd',
    'Poodle', 'Bulldog', 'Beagle', 'Chihuahua', 'Mestizo/Cruzado'
];

const Register = () => {
    const [step, setStep] = useState(1);
    const [clientData, setClientData] = useState({
        name: '', phone: '', email: '', password: '', confirmPassword: ''
    });
    const [petData, setPetData] = useState({
        petName: '', species: 'Perro', breed: '', age: '', weight: '', notes: ''
    });
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleClientChange = (e) =>
        setClientData({ ...clientData, [e.target.id]: e.target.value });

    const handlePetChange = (e) =>
        setPetData({ ...petData, [e.target.id]: e.target.value });

    // ── Paso 1 → 2 ───────────────────────────────────────────────────────────
    const handleNext = (e) => {
        e.preventDefault();
        setError('');
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
            const newUser = await register(clientData, petData); // ← await corregido
            if (newUser) navigate('/');
            else setError('Error en el registro. Intenta de nuevo.');
        } catch (err) {
            setError('Error al conectar con el servidor.');
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
                    onChange={handleClientChange} required />
            </div>
            <div className="input-group">
                <label>Teléfono</label>
                <input type="tel" id="phone" placeholder="555-0000"
                    onChange={handleClientChange} required />
            </div>
            <div className="input-group">
                <label>Email</label>
                <input type="email" id="email" placeholder="tu@email.com"
                    onChange={handleClientChange} required />
            </div>
            <div className="row-group">
                <div className="input-group">
                    <label>Contraseña</label>
                    <input type="password" id="password" placeholder="••••••••"
                        onChange={handleClientChange} required />
                </div>
                <div className="input-group">
                    <label>Confirmar</label>
                    <input type="password" id="confirmPassword" placeholder="••••••••"
                        onChange={handleClientChange} required />
                </div>
            </div>
            <button type="submit" className="register-button primary">
                Siguiente →
            </button>
        </form>
    );

    // ── Step 2: datos de la mascota ───────────────────────────────────────────
    const renderStep2 = () => (
        <form onSubmit={handleSubmit}>
            <div className="input-group">
                <label>Nombre de tu mascota</label>
                <input type="text" id="petName" placeholder="Firulais"
                    onChange={handlePetChange} required />
            </div>
            <div className="input-group">
                <label>Especie</label>
                <select id="species" onChange={handlePetChange}>
                    <option value="Perro">🐶 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Otro">🐾 Otro</option>
                </select>
            </div>
            <div className="input-group">
                <label>Raza</label>
                <select id="breed" onChange={handlePetChange} required>
                    <option value="">Selecciona una raza</option>
                    {commonBreeds.map(b => (
                        <option key={b} value={b}>{b}</option>
                    ))}
                </select>
            </div>
            <div className="row-group">
                <div className="input-group">
                    <label>Edad (años)</label>
                    <input type="number" id="age" min="0" max="30" placeholder="2"
                        onChange={handlePetChange} required />
                </div>
                <div className="input-group">
                    <label>Peso (kg)</label>
                    <input type="number" id="weight" min="0" step="0.1" placeholder="10"
                        onChange={handlePetChange} required />
                </div>
            </div>
            <div className="input-group">
                <label>Notas (alergias, condiciones)</label>
                <textarea id="notes" rows="2" placeholder="Ej: alergia al pollo..."
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