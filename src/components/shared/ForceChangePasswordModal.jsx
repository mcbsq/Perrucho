// src/components/shared/ForceChangePasswordModal.jsx
//
// Se muestra cuando user.mustChangePassword es true — el primer login tras
// una contraseña temporal generada por AEGIS (alta de cuenta, reset de
// contraseña, o el cutover a AEGIS). Bloquea el resto de la app hasta que
// la persona fije su propia contraseña; AEGIS exige mínimo 12 caracteres
// para la nueva.
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ForceChangePasswordModal.css';

const ForceChangePasswordModal = () => {
    const { changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 12) {
            setError('La nueva contraseña debe tener al menos 12 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
        } catch (err) {
            setError(err.message || 'No se pudo cambiar la contraseña. Verifica la temporal.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fcp-overlay">
            <div className="fcp-card">
                <div className="fcp-icon">🔑</div>
                <h2>Cambia tu contraseña</h2>
                <p className="fcp-subtitle">
                    Entraste con una contraseña temporal — necesitas fijar la tuya antes de continuar.
                </p>
                <form onSubmit={handleSubmit}>
                    {error && <div className="fcp-error">{error}</div>}
                    <div className="fcp-field">
                        <label>Contraseña temporal actual</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="La que recibiste"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="fcp-field">
                        <label>Nueva contraseña</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 12 caracteres"
                            required
                        />
                    </div>
                    <div className="fcp-field">
                        <label>Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite la contraseña"
                            required
                        />
                    </div>
                    <button type="submit" className="fcp-submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Cambiar contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForceChangePasswordModal;
