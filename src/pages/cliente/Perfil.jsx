import React, { useState, useEffect } from 'react';
import { 
    FaUser, FaPaw, FaHistory, FaCalendarCheck, 
    FaPlus, FaShoppingBag, FaStethoscope, FaSignOutAlt, FaTimes 
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './Perfil.css';

const Perfil = () => {
    const { user, logout } = useAuth();
    
    // --- ESTADOS DE DATOS (Conectados a LocalStorage) ---
    const [mascotas, setMascotas] = useState(() => {
        const saved = localStorage.getItem('perrucho_mascotas');
        return saved ? JSON.parse(saved) : [
            { id: 1, nombre: "Max", especie: "Perro", raza: "Golden Retriever", edad: "3 años" }
        ];
    });

    const [userData, setUserData] = useState(() => {
        const saved = localStorage.getItem('perrucho_user_data');
        return saved ? JSON.parse(saved) : {
            name: user?.name || 'Usuario',
            email: user?.email || '',
            phone: '555-0123',
            address: 'Calle Falsa 123'
        };
    });

    // --- ESTADOS DE UI (Modales) ---
    const [showMascotaModal, setShowMascotaModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);

    // --- EFECTOS PARA PERSISTENCIA ---
    useEffect(() => {
        localStorage.setItem('perrucho_mascotas', JSON.stringify(mascotas));
    }, [mascotas]);

    useEffect(() => {
        localStorage.setItem('perrucho_user_data', JSON.stringify(userData));
    }, [userData]);

    useEffect(() => {
    if (showMascotaModal || showUserModal) {
        document.body.classList.add('modal-open');
    } else {
        document.body.classList.remove('modal-open');
    }
}, [showMascotaModal, showUserModal]);

    // --- MANEJADORES DE FORMULARIO ---
    
    // Guardar/Editar Perfil
    const handleUpdateUser = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedData = {
            name: formData.get('userName'),
            email: formData.get('userEmail'),
            phone: formData.get('userPhone'),
            address: formData.get('userAddress')
        };
        setUserData(updatedData);
        setShowUserModal(false);
    };

    // Agregar Nueva Mascota
    const handleAddMascota = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newPet = {
            id: Date.now(),
            nombre: formData.get('petName'),
            especie: formData.get('petSpecies'),
            raza: formData.get('petBreed'),
            edad: formData.get('petAge')
        };
        setMascotas([...mascotas, newPet]);
        setShowMascotaModal(false);
    };

    return (
        <div className="perfil-container fade-in">
            <div className="perfil-grid">
                
                {/* 1. SIDEBAR: INFO PERSONAL */}
                <aside className="perfil-sidebar">
                    <div className="profile-card user-info">
                        <div className="avatar-large">
                            {userData.name.charAt(0)}
                        </div>
                        <h2>{userData.name}</h2>
                        <p className="user-email">{userData.email}</p>
                        <span className="badge-role">{user?.role || 'Cliente'}</span>
                        <div className="user-details-mini">
                            <p>📞 {userData.phone}</p>
                            <p>📍 {userData.address}</p>
                        </div>
                        <hr />
                        <button className="btn-edit-profile" onClick={() => setShowUserModal(true)}>
                            Editar Datos
                        </button>
                        <button className="btn-logout-alt" onClick={logout}>
                            <FaSignOutAlt /> Cerrar Sesión
                        </button>
                    </div>

                    {/* 2. AGENDA */}
                    <div className="profile-card next-service">
                        <h3><FaCalendarCheck /> Próxima Cita</h3>
                        <div className="next-appointment-box">
                            <p className="appt-service">Vacunación Anual</p>
                            <p>📅 2026-03-05</p>
                            <p>🐾 Mascota: {mascotas[0]?.nombre || 'Sin registrar'}</p>
                        </div>
                    </div>
                </aside>

                <main className="perfil-main-content">
                    
                    {/* 3. SECCIÓN MASCOTAS */}
                    <section className="profile-section">
                        <div className="section-header">
                            <h3><FaPaw /> Mis Mascotas</h3>
                            <button className="btn-add" onClick={() => setShowMascotaModal(true)}>
                                <FaPlus /> Agregar
                            </button>
                        </div>
                        <div className="mascotas-grid">
                            {mascotas.map(pet => (
                                <div key={pet.id} className="pet-card">
                                    <div className="pet-icon"><FaPaw /></div>
                                    <h4>{pet.nombre}</h4>
                                    <p>{pet.especie} - {pet.raza}</p>
                                    <span>{pet.edad}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4. HISTORIAL (Simulado) */}
                    <div className="history-tabs-container">
                        <section className="profile-section">
                            <h3><FaShoppingBag /> Compras Recientes</h3>
                            <div className="history-table-wrapper">
                                <table className="history-table">
                                    <thead>
                                        <tr><th>ID</th><th>Producto</th><th>Total</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>ORD-001</td><td>Croquetas Pro</td><td>$850</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </main>
            </div>

            {/* --- MODAL AGREGAR MASCOTA --- */}
            {showMascotaModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Nueva Mascota</h3>
                            <button className="close-btn" onClick={() => setShowMascotaModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleAddMascota}>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input name="petName" type="text" placeholder="Ej: Firulais" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Especie</label>
                                    <select name="petSpecies">
                                        <option value="Perro">Perro</option>
                                        <option value="Gato">Gato</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Edad</label>
                                    <input name="petAge" type="text" placeholder="Ej: 2 años" required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Raza</label>
                                <input name="petBreed" type="text" placeholder="Ej: Poodle" required />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-save">Guardar Mascota</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL EDITAR PERFIL --- */}
            {showUserModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Editar Mi Perfil</h3>
                            <button className="close-btn" onClick={() => setShowUserModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleUpdateUser}>
                            <div className="form-group">
                                <label>Nombre Completo</label>
                                <input name="userName" defaultValue={userData.name} required />
                            </div>
                            <div className="form-group">
                                <label>Correo Electrónico</label>
                                <input name="userEmail" defaultValue={userData.email} required />
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input name="userPhone" defaultValue={userData.phone} required />
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <input name="userAddress" defaultValue={userData.address} required />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-save">Actualizar Datos</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Perfil;