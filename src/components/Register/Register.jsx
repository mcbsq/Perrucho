// src/components/Register/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css'; 
import { useAuth } from '../../contexts/AuthContext'; 

const commonBreeds = ['Labrador Retriever', 'German Shepherd', 'Poodle', 'Bulldog', 'Beagle', 'Chihuahua', 'Mestizo/Cruzado'];

const Register = () => {
    const [step, setStep] = useState(1);
    const [clientData, setClientData] = useState({
        name: '', phone: '', email: '', password: '', confirmPassword: ''
    });
    const [petData, setPetData] = useState({
        petName: '', species: 'Perro', breed: '', age: '', weight: '', notes: ''
    });
    const [error, setError] = useState(''); 
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleClientChange = (e) => setClientData({ ...clientData, [e.target.id]: e.target.value });
    const handlePetChange = (e) => setPetData({ ...petData, [e.target.id]: e.target.value });

    const handleNext = (e) => {
        e.preventDefault();
        setError('');
        if (clientData.password !== clientData.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const success = register(clientData, petData); 
            if (success) navigate('/');
            else setError('Error en el registro.');
        } catch (err) {
            setError('Error al conectar con el servidor.');
        }
    };
    
    const renderStep1Owner = () => (
        <form onSubmit={handleNext}>
            <h3>Paso 1: Datos del Dueño</h3>
            <div className="input-group"><label>Nombre</label><input type="text" id="name" onChange={handleClientChange} required /></div>
            <div className="input-group"><label>Teléfono</label><input type="tel" id="phone" onChange={handleClientChange} required /></div>
            <div className="input-group"><label>Email</label><input type="email" id="email" onChange={handleClientChange} required /></div>
            <div className="input-group"><label>Contraseña</label><input type="password" id="password" onChange={handleClientChange} required /></div>
            <div className="input-group"><label>Confirmar</label><input type="password" id="confirmPassword" onChange={handleClientChange} required /></div>
            <button type="submit" className="register-button primary">Siguiente</button>
        </form>
    );

    const renderStep2Pet = () => (
        <form onSubmit={handleSubmit}>
            <h3>Paso 2: Datos de la Mascota</h3>
            <div className="input-group"><label>Nombre Mascota</label><input type="text" id="petName" onChange={handlePetChange} required /></div>
            <div className="input-group">
                <label>Raza</label>
                <select id="breed" onChange={handlePetChange} required>
                    <option value="">Selecciona</option>
                    {commonBreeds.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
            <div className="row-group">
                <div className="input-group"><label>Edad</label><input type="number" id="age" onChange={handlePetChange} required /></div>
                <div className="input-group"><label>Peso (Kg)</label><input type="number" id="weight" onChange={handlePetChange} required /></div>
            </div>
            <div className="register-actions">
                <button type="button" onClick={() => setStep(1)} className="register-button secondary">Volver</button>
                <button type="submit" className="register-button primary">Registrar</button>
            </div>
        </form>
    );

    return (
        <div className="register-container">
            <div className="register-card">
                <h2>Registro</h2>
                {error && <p className="error-message">{error}</p>}
                {step === 1 ? renderStep1Owner() : renderStep2Pet()}
            </div>
        </div>
    );
};

export default Register;