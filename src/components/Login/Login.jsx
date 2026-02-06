import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; 
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setError('');

        try {
            // Obtenemos el usuario que retorna la función login
            const loggedUser = login(email, password); 

            if (loggedUser) {
                // Redirección basada estrictamente en el rol retornado
                if (loggedUser.role === 'administrador') {
                    navigate('/admin-dashboard');
                } else if (loggedUser.role === 'empleado') {
                    navigate('/employee-dashboard'); 
                } else {
                    navigate('/'); 
                }
            } else {
                setError('Email o contraseña incorrectos.');
            }
        } catch (err) {
            setError('Error al conectar con el servidor.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Iniciar Sesión</h2>
                <form onSubmit={handleSubmit}>
                    {error && <p className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</p>} 
                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="login-button">Entrar</button>
                </form>
                <div className="login-footer">
                    <p>¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;