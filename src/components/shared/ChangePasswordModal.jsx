// src/components/shared/ChangePasswordModal.jsx
//
// Antes el único lugar para cambiar contraseña era "olvidé mi contraseña"
// (ForgotPassword.jsx) o el modal forzoso tras un login con temporal
// (ForceChangePasswordModal.jsx) — no había forma de cambiarla por gusto,
// sin haberla olvidado. Este es ese tercer camino: se puede abrir y cerrar
// libremente, disponible para cualquier rol (admin, empleado, cliente).
// El mínimo de caracteres varía por negocio (6 local / 12 AEGIS) — en vez
// de duplicar esa regla aquí, se deja que el backend la aplique y se
// muestra su mensaje de error tal cual.
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ForceChangePasswordModal.css';

const ChangePasswordModal = ({ onClose }) => {
    const { changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'No se pudo cambiar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fcp-overlay" onClick={onClose}>
            <div className="fcp-card" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                <button type="button" onClick={onClose} aria-label="Cerrar"
                    style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>
                    ✕
                </button>
                <div className="fcp-icon">🔑</div>
                <h2>Cambiar contraseña</h2>
                {success ? (
                    <>
                        <p className="fcp-subtitle">Tu contraseña se actualizó correctamente.</p>
                        <button type="button" className="fcp-submit" onClick={onClose}>Listo</button>
                    </>
                ) : (
                    <>
                        <p className="fcp-subtitle">Ingresa tu contraseña actual y la nueva que quieras usar.</p>
                        <form onSubmit={handleSubmit}>
                            {error && <div className="fcp-error">{error}</div>}
                            <div className="fcp-field">
                                <label>Contraseña actual</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
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
                                    required
                                />
                            </div>
                            <div className="fcp-field">
                                <label>Confirmar nueva contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="fcp-submit" disabled={loading}>
                                {loading ? 'Guardando...' : 'Cambiar contraseña'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordModal;
