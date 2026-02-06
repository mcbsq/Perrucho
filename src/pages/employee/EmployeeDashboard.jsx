import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
    FaShoppingBag, FaPaw, FaChevronLeft, FaChevronRight, 
    FaPlusCircle, FaSignOutAlt, FaUserTie, FaUsers, FaChartPie, 
    FaEdit, FaTrash, FaCalendarAlt, FaNotesMedical, FaClock, 
    FaCheckCircle, FaTimes, FaSave, FaHistory
} from 'react-icons/fa';
import '../admin/AdminDashboard.css'; 

const EmployeeDashboard = () => {
    const { 
        products, pets, clients,
        addProduct, updateProduct, deleteProduct,
        addClient, updateClient, deleteClient,
        addPet, updatePet, deletePet 
    } = useData();
    const { logout, user } = useAuth();
    
    const [tab, setTab] = useState('agenda');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [editingId, setEditingId] = useState(null);

    // --- ESTADOS DE MODAL DE EXPEDIENTE ---
    const [showMedicalModal, setShowMedicalModal] = useState(false);
    const [activeMedicalPet, setActiveMedicalPet] = useState(null);

    // --- LÓGICA DE AGENDA ---
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [showAppoForm, setShowAppoForm] = useState(false);
    const [appoForm, setAppoForm] = useState({ 
        petId: '', time: '', date: new Date().toISOString().split('T')[0], service: '', status: 'Pendiente' 
    });

    useEffect(() => {
        const savedAppos = localStorage.getItem('vet_appointments');
        if (savedAppos) setAppointments(JSON.parse(savedAppos));
    }, []);

    useEffect(() => {
        localStorage.setItem('vet_appointments', JSON.stringify(appointments));
    }, [appointments]);

    const handleAddAppointment = (e) => {
        e.preventDefault();
        const newAppo = { ...appoForm, id: Date.now() };
        setAppointments([...appointments, newAppo]);
        setAppoForm({ petId: '', time: '', date: new Date().toISOString().split('T')[0], service: '', status: 'Pendiente' });
        setShowAppoForm(false);
    };

    const updateAppoStatus = (id, newStatus) => {
        setAppointments(appointments.map(a => a.id === id ? {...a, status: newStatus} : a));
    };

    // --- RESUMEN DE ACTIVIDAD ---
    const activityStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return {
            today: appointments.filter(a => a.date === todayStr).length,
            week: appointments.filter(a => new Date(a.date) >= startOfWeek).length,
            month: appointments.filter(a => new Date(a.date) >= startOfMonth).length
        };
    }, [appointments]);

    // --- FORMULARIOS DE GESTIÓN ---
    const [productForm, setProductForm] = useState({ name: '', price: '', stock: '', category: 'Alimentos' });
    const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '' });
    const [petForm, setPetForm] = useState({ petName: '', breed: '', weight: '', ownerId: '', notes: '' });

    const openMedicalFile = (pet) => {
        setActiveMedicalPet({...pet});
        setShowMedicalModal(true);
    };

    const saveMedicalNotes = () => {
        updatePet(activeMedicalPet.id, activeMedicalPet);
        setShowMedicalModal(false);
    };

    const startEdit = (type, item) => {
        setEditingId(item.id);
        if (type === 'product') setProductForm(item);
        if (type === 'client') setClientForm(item);
        if (type === 'pet') setPetForm(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setProductForm({ name: '', price: '', stock: '', category: 'Alimentos' });
        setClientForm({ name: '', phone: '', email: '' });
        setPetForm({ petName: '', breed: '', weight: '', ownerId: '', notes: '' });
    };

    const handleSave = (type, e) => {
        e.preventDefault();
        if (type === 'product') editingId ? updateProduct(editingId, productForm) : addProduct(productForm);
        if (type === 'client') editingId ? updateClient(editingId, clientForm) : addClient(clientForm);
        if (type === 'pet') editingId ? updatePet(editingId, petForm) : addPet(petForm);
        cancelEdit();
    };

    return (
        <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            {/* MODAL DE EXPEDIENTE MÉDICO */}
            {showMedicalModal && activeMedicalPet && (
                <div className="modal-overlay" style={{zIndex: 5000}}>
                    <div className="modal-capsule fade-in" style={{maxWidth: '700px', borderRadius: '40px'}}>
                        <button className="close-btn" onClick={() => setShowMedicalModal(false)}><FaTimes /></button>
                        <div className="modal-step-content" style={{textAlign: 'left', alignItems: 'flex-start'}}>
                            <div style={{display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '25px'}}>
                                <div className="service-modal-icon" style={{width: '70px', height: '70px', fontSize: '2.5rem'}}><FaPaw /></div>
                                <div>
                                    <h2 style={{margin: 0}}>Expediente: {activeMedicalPet.petName}</h2>
                                    <p style={{color: 'var(--text-muted)'}}>{activeMedicalPet.breed} • {activeMedicalPet.weight}kg</p>
                                </div>
                            </div>

                            <div className="modal-form-group">
                                <label><FaHistory /> Historial y Notas del Especialista</label>
                                <textarea 
                                    style={{width: '100%', minHeight: '250px', padding: '20px', borderRadius: '20px', border: '2px solid #f1f5f9', outline: 'none', fontFamily: 'inherit'}}
                                    value={activeMedicalPet.notes}
                                    onChange={(e) => setActiveMedicalPet({...activeMedicalPet, notes: e.target.value})}
                                    placeholder="Escribe aquí la evolución del paciente, tratamientos aplicados, vacunas..."
                                />
                            </div>

                            <button className="btn-modal-primary" onClick={saveMedicalNotes} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                                <FaSave /> Guardar Cambios en Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="admin-top-bar">
                <div className="admin-user-info">
                    <FaUserTie /> <span>Staff: <strong>{user?.name || "Especialista"}</strong></span>
                </div>
                <button className="logout-pill" onClick={logout}><FaSignOutAlt /> Salir</button>
            </header>

            <aside className="admin-sidebar">
                <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
                </button>
                <div className="sidebar-header">{isSidebarOpen && <h3>Perrucho | Staff</h3>}</div>
                <nav className="sidebar-nav">
                    <button onClick={() => setTab('agenda')} className={`nav-capsule ${tab === 'agenda' ? 'active' : ''}`}><FaCalendarAlt /> {isSidebarOpen && <span>Agenda Hoy</span>}</button>
                    <button onClick={() => setTab('resumen')} className={`nav-capsule ${tab === 'resumen' ? 'active' : ''}`}><FaChartPie /> {isSidebarOpen && <span>Actividad</span>}</button>
                    <button onClick={() => setTab('clientes')} className={`nav-capsule ${tab === 'clientes' ? 'active' : ''}`}><FaUsers /> {isSidebarOpen && <span>Clientes</span>}</button>
                    <button onClick={() => setTab('pacientes')} className={`nav-capsule ${tab === 'pacientes' ? 'active' : ''}`}><FaPaw /> {isSidebarOpen && <span>Pacientes</span>}</button>
                    <button onClick={() => setTab('productos')} className={`nav-capsule ${tab === 'productos' ? 'active' : ''}`}><FaShoppingBag /> {isSidebarOpen && <span>Inventario</span>}</button>
                </nav>
            </aside>

            <main className="admin-main-panel">
                <div className="content-body">
                    {/* AGENDA INTERACTIVA */}
                    {tab === 'agenda' && (
                        <div className="pacientes-container-layout fade-in">
                            <div className="pacientes-main-col">
                                <div className="agenda-header-container" style={{background: 'white', padding: '25px', borderRadius: '30px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div>
                                        <h3 style={{margin: 0}}>Agenda del Día</h3>
                                        <p style={{margin: 0, color: 'var(--text-muted)'}}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    </div>
                                    <button className="main-action-btn sm" onClick={() => setShowAppoForm(!showAppoForm)}>
                                        <FaPlusCircle /> Agendar Cita
                                    </button>
                                </div>

                                {showAppoForm && (
                                    <form className="dashboard-form fade-in" onSubmit={handleAddAppointment} style={{marginBottom: '30px', background: '#f8fafc'}}>
                                        <div className="input-grid">
                                            <select value={appoForm.petId} onChange={e => setAppoForm({...appoForm, petId: e.target.value})} required>
                                                <option value="">¿Quién es el paciente?</option>
                                                {pets.map(p => <option key={p.id} value={p.id}>{p.petName}</option>)}
                                            </select>
                                            <input type="time" value={appoForm.time} onChange={e => setAppoForm({...appoForm, time: e.target.value})} required />
                                            <input type="text" placeholder="¿Qué servicio requiere?" value={appoForm.service} onChange={e => setAppoForm({...appoForm, service: e.target.value})} required />
                                        </div>
                                        <button type="submit" className="main-action-btn">Agregar a la lista</button>
                                    </form>
                                )}

                                <div className="agenda-list-full">
                                    {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length === 0 && (
                                        <div style={{textAlign: 'center', padding: '50px', color: '#94a3b8'}}>
                                            <FaPaw style={{fontSize: '3rem', opacity: 0.2}} />
                                            <p>No hay citas registradas para hoy.</p>
                                        </div>
                                    )}
                                    {appointments
                                        .filter(a => a.date === new Date().toISOString().split('T')[0])
                                        .sort((a,b) => a.time.localeCompare(b.time))
                                        .map(appo => {
                                            const pet = pets.find(p => String(p.id) === String(appo.petId));
                                            return (
                                                <div 
                                                    key={appo.id} 
                                                    className={`agenda-item-v2 ${selectedAppointment?.id === appo.id ? 'active' : ''} ${appo.status === 'Atendido' ? 'completed' : ''}`} 
                                                    onClick={() => setSelectedAppointment(appo)}
                                                >
                                                    <div className="time-tag"><FaClock /> {appo.time}</div>
                                                    <div className="appo-body">
                                                        <strong>{pet?.petName || "Mascota"}</strong>
                                                        <span>{appo.service}</span>
                                                    </div>
                                                    <div className={`status-pill ${appo.status === 'Atendido' ? 'success' : ''}`}>
                                                        {appo.status}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            <aside className="pacientes-agenda-side">
                                {selectedAppointment ? (
                                    <div className="quick-file-v2 fade-in">
                                        <div className="file-header"><FaNotesMedical /> <h5>Detalle de Cita</h5></div>
                                        {(() => {
                                            const pet = pets.find(p => String(p.id) === String(selectedAppointment.petId));
                                            const owner = clients.find(c => String(c.id) === String(pet?.ownerId));
                                            return (
                                                <div className="file-card-inner">
                                                    <div className="pet-mini-info">
                                                        <h4>{pet?.petName}</h4>
                                                        <p>Dueño: {owner?.name}</p>
                                                        <p>Cel: {owner?.phone}</p>
                                                    </div>
                                                    <div className="notes-preview">
                                                        <strong>Últimas Notas:</strong>
                                                        <p>{pet?.notes || "Sin antecedentes registrados."}</p>
                                                    </div>
                                                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
                                                        <button className="main-action-btn sm" onClick={() => openMedicalFile(pet)}>
                                                            <FaEdit /> Abrir Expediente Completo
                                                        </button>
                                                        {selectedAppointment.status !== 'Atendido' && (
                                                            <button 
                                                                className="main-action-btn sm" 
                                                                style={{background: '#10b981'}}
                                                                onClick={() => updateAppoStatus(selectedAppointment.id, 'Atendido')}
                                                            >
                                                                <FaCheckCircle /> Finalizar Atención
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="empty-state-card" style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '30px'}}>
                                        <p>Selecciona una cita<br/>para ver el expediente</p>
                                    </div>
                                )}
                            </aside>
                        </div>
                    )}

                    {/* RESUMEN DE ACTIVIDAD */}
                    {tab === 'resumen' && (
                        <div className="control-grid fade-in">
                            <div className="stat-card"><h3>{activityStats.today}</h3><p>Citas de Hoy</p></div>
                            <div className="stat-card"><h3>{activityStats.week}</h3><p>Atenciones Semanales</p></div>
                            <div className="stat-card"><h3>{activityStats.month}</h3><p>Atenciones Mensuales</p></div>
                            <div className="stat-card" style={{background: 'var(--accent-blue)', color: 'white'}}>
                                <h3>{pets.length}</h3>
                                <p style={{color: 'white', opacity: 0.8}}>Pacientes Totales</p>
                            </div>
                        </div>
                    )}

                    {/* GESTIÓN DE CLIENTES */}
                    {tab === 'clientes' && (
                        <div className="fade-in">
                            <form onSubmit={(e) => handleSave('client', e)} className="dashboard-form">
                                <div className="form-header"><FaPlusCircle /> <h4>Registrar Cliente</h4></div>
                                <div className="input-grid">
                                    <input type="text" placeholder="Nombre" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} required />
                                    <input type="text" placeholder="Teléfono" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} required />
                                    <input type="email" placeholder="Correo" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} required />
                                </div>
                                <button type="submit" className="main-action-btn">{editingId ? 'Actualizar Datos' : 'Registrar Nuevo Cliente'}</button>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Nombre</th><th>Contacto</th><th>Acciones</th></tr></thead>
                                    <tbody>{clients.map(c => (
                                        <tr key={c.id}><td>{c.name}</td><td>{c.phone}</td>
                                        <td><button onClick={() => startEdit('client', c)} className="edit-btn"><FaEdit /></button></td></tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* GESTIÓN DE PACIENTES */}
                    {tab === 'pacientes' && (
                        <div className="fade-in">
                            <form onSubmit={(e) => handleSave('pet', e)} className="dashboard-form">
                                <div className="form-header"><FaPlusCircle /> <h4>Alta de Paciente</h4></div>
                                <div className="input-grid">
                                    <input type="text" placeholder="Nombre Mascota" value={petForm.petName} onChange={e => setPetForm({...petForm, petName: e.target.value})} required />
                                    <input type="text" placeholder="Raza" value={petForm.breed} onChange={e => setPetForm({...petForm, breed: e.target.value})} required />
                                    <input type="number" placeholder="Peso (kg)" value={petForm.weight} onChange={e => setPetForm({...petForm, weight: e.target.value})} required />
                                    <select value={petForm.ownerId} onChange={e => setPetForm({...petForm, ownerId: e.target.value})} required>
                                        <option value="">Asignar a un Dueño...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="main-action-btn">Registrar Paciente</button>
                            </form>
                            <div className="patient-gallery" style={{marginTop: '30px'}}>
                                {pets.map(p => (
                                    <div key={p.id} className="pet-capsule-card" onClick={() => openMedicalFile(p)} style={{cursor: 'pointer'}}>
                                        <div className="pet-info">
                                            <h4>{p.petName}</h4>
                                            <p>{p.breed} • {p.weight}kg</p>
                                        </div>
                                        <FaNotesMedical style={{color: 'var(--accent-blue)'}} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STOCK (SOLO LECTURA/EDICIÓN DE CANTIDAD) */}
                    {tab === 'productos' && (
                        <div className="fade-in">
                            <h3 style={{marginBottom: '20px'}}>Control de Existencias</h3>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Producto</th><th>Categoría</th><th>Stock Actual</th><th>Acciones</th></tr></thead>
                                    <tbody>{products.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.name}</td>
                                            <td>{p.category}</td>
                                            <td>
                                                <span className={`status-pill ${p.stock < 5 ? 'warning' : 'success'}`}>
                                                    {p.stock} unidades
                                                </span>
                                            </td>
                                            <td><button onClick={() => startEdit('product', p)} className="edit-btn"><FaEdit /> Ajustar</button></td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default EmployeeDashboard;