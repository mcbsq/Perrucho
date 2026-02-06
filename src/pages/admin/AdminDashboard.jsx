import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { 
    FaCut, FaShoppingBag, FaPaw, FaChevronLeft, FaChevronRight, 
    FaPlusCircle, FaSignOutAlt, FaUserShield, FaUsers, FaChartLine, 
    FaEdit, FaTrash, FaFileExcel, FaCalendarAlt, FaNotesMedical, FaClock 
} from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { 
        services, products, pets, clients, sales, 
        addService, updateService, deleteService,
        addProduct, updateProduct, deleteProduct,
        addClient, updateClient, deleteClient,
        addPet, updatePet, deletePet 
    } = useData();
    const { logout, user } = useAuth();
    
    const [tab, setTab] = useState('control');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [editingId, setEditingId] = useState(null);

    // --- LÓGICA DE AGENDA PERSISTENTE ---
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [showAppoForm, setShowAppoForm] = useState(false);
    const [appoForm, setAppoForm] = useState({ petId: '', time: '', service: '', status: 'Pendiente' });

    // Cargar citas del localStorage al iniciar
    useEffect(() => {
        const savedAppos = localStorage.getItem('vet_appointments');
        if (savedAppos) setAppointments(JSON.parse(savedAppos));
    }, []);

    // Guardar citas cuando cambien
    useEffect(() => {
        localStorage.setItem('vet_appointments', JSON.stringify(appointments));
    }, [appointments]);

    const handleAddAppointment = (e) => {
        e.preventDefault();
        const newAppo = { ...appoForm, id: Date.now() };
        setAppointments([...appointments, newAppo]);
        setAppoForm({ petId: '', time: '', service: '', status: 'Pendiente' });
        setShowAppoForm(false);
    };

    const deleteAppointment = (id) => {
        setAppointments(appointments.filter(a => a.id !== id));
        if (selectedAppointment?.id === id) setSelectedAppointment(null);
    };

    // --- ESTADOS DE FORMULARIOS ---
    const [serviceForm, setServiceForm] = useState({ title: '', description: '', price: '', duration: '', category: 'Estética' });
    const [productForm, setProductForm] = useState({ name: '', price: '', stock: '', category: 'Alimentos' });
    const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '' });
    const [petForm, setPetForm] = useState({ petName: '', breed: '', weight: '', ownerId: '', notes: '' });

    const stats = useMemo(() => ({
        totalSales: sales.reduce((acc, s) => acc + Number(s.price), 0),
        lowStock: products.filter(p => Number(p.stock) < 5).length,
        totalPets: pets.length,
        totalClients: clients.length
    }), [sales, products, pets, clients]);

    const exportToExcel = () => {
        const dataToExport = sales.map(s => ({
            'Fecha de Venta': s.date,
            'Concepto / Item': s.item,
            'Monto Total ($)': Number(s.price),
            'ID Operación': s.id
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Ventas");
        XLSX.writeFile(workbook, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const startEdit = (type, item) => {
        setEditingId(item.id);
        if (type === 'service') setServiceForm(item);
        if (type === 'product') setProductForm(item);
        if (type === 'client') setClientForm(item);
        if (type === 'pet') setPetForm(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setServiceForm({ title: '', description: '', price: '', duration: '', category: 'Estética' });
        setProductForm({ name: '', price: '', stock: '', category: 'Alimentos' });
        setClientForm({ name: '', phone: '', email: '' });
        setPetForm({ petName: '', breed: '', weight: '', ownerId: '', notes: '' });
    };

    const handleSave = (type, e) => {
        e.preventDefault();
        if (type === 'service') editingId ? updateService(editingId, serviceForm) : addService(serviceForm);
        if (type === 'product') editingId ? updateProduct(editingId, productForm) : addProduct(productForm);
        if (type === 'client') editingId ? updateClient(editingId, clientForm) : addClient(clientForm);
        if (type === 'pet') editingId ? updatePet(editingId, petForm) : addPet(petForm);
        cancelEdit();
    };

    return (
        <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <header className="admin-top-bar">
                <div className="admin-user-info">
                    <FaUserShield /> <span>Admin: <strong>{user?.name || "Frontend Dev"}</strong></span>
                </div>
                <button className="logout-pill" onClick={logout}><FaSignOutAlt /> Cerrar Sesión</button>
            </header>

            <aside className="admin-sidebar">
                <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
                </button>
                <div className="sidebar-header">{isSidebarOpen && <h3>Perrucho | Admin</h3>}</div>
                <nav className="sidebar-nav">
                    <button onClick={() => setTab('control')} className={`nav-capsule ${tab === 'control' ? 'active' : ''}`}><FaChartLine /> {isSidebarOpen && <span>Control</span>}</button>
                    <button onClick={() => setTab('clientes')} className={`nav-capsule ${tab === 'clientes' ? 'active' : ''}`}><FaUsers /> {isSidebarOpen && <span>Clientes</span>}</button>
                    <button onClick={() => setTab('pacientes')} className={`nav-capsule ${tab === 'pacientes' ? 'active' : ''}`}><FaPaw /> {isSidebarOpen && <span>Pacientes</span>}</button>
                    <button onClick={() => setTab('servicios')} className={`nav-capsule ${tab === 'servicios' ? 'active' : ''}`}><FaCut /> {isSidebarOpen && <span>Servicios</span>}</button>
                    <button onClick={() => setTab('productos')} className={`nav-capsule ${tab === 'productos' ? 'active' : ''}`}><FaShoppingBag /> {isSidebarOpen && <span>Productos</span>}</button>
                </nav>
            </aside>

            <main className="admin-main-panel">
                <header className="content-header">
                    <h2>{editingId ? `Editando ${tab.slice(0,-1)}` : `Gestión de ${tab}`}</h2>
                </header>

                <div className="content-body">
                    {/* CONTROL */}
                    {tab === 'control' && (
                        <div className="control-grid fade-in">
                            <div className="stat-card"><h3>${stats.totalSales}</h3><p>Ventas Totales</p></div>
                            <div className="stat-card"><h3>{stats.totalPets}</h3><p>Pacientes</p></div>
                            <div className="stat-card"><h3>{stats.totalClients}</h3><p>Clientes</p></div>
                            <div className="stat-card warning"><h3>{stats.lowStock}</h3><p>Stock Crítico</p></div>
                            
                            <div className="full-width-table">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h4 style={{ margin: 0 }}>Historial Reciente de Ventas</h4>
                                    <button onClick={exportToExcel} className="logout-pill" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                                        <FaFileExcel /> Exportar Excel
                                    </button>
                                </div>
                                <table>
                                    <thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr></thead>
                                    <tbody>
                                        {sales.map(s => (
                                            <tr key={s.id}><td>{s.date}</td><td>{s.item}</td><td>${s.price}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CLIENTES */}
                    {tab === 'clientes' && (
                        <div className="fade-in">
                            <form onSubmit={(e) => handleSave('client', e)} className={`dashboard-form ${editingId ? 'edit-mode' : ''}`}>
                                <div className="form-header">{editingId ? <FaEdit /> : <FaPlusCircle />} <h4>{editingId ? "Actualizar Cliente" : "Nuevo Cliente"}</h4></div>
                                <div className="input-grid">
                                    <input type="text" placeholder="Nombre Completo" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} required />
                                    <input type="text" placeholder="Teléfono" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} required />
                                    <input type="email" placeholder="Email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} required />
                                </div>
                                <div className="btn-group">
                                    <button type="submit" className="main-action-btn">{editingId ? 'Guardar Cambios' : 'Registrar Cliente'}</button>
                                    {editingId && <button onClick={cancelEdit} className="cancel-btn">Cancelar</button>}
                                </div>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead>
                                    <tbody>{clients.map(c => (
                                        <tr key={c.id}><td>{c.name}</td><td>{c.phone}</td><td>{c.email}</td>
                                        <td className="actions-cell">
                                            <button onClick={() => startEdit('client', c)} className="edit-btn"><FaEdit /></button>
                                            <button onClick={() => deleteClient(c.id)} className="delete-btn"><FaTrash /></button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PACIENTES + AGENDA MEJORADA */}
                    {tab === 'pacientes' && (
                        <div className="pacientes-container-layout fade-in">
                            <div className="pacientes-main-col">
                                <form onSubmit={(e) => handleSave('pet', e)} className={`dashboard-form ${editingId ? 'edit-mode' : ''}`}>
                                    <div className="form-header">{editingId ? <FaEdit /> : <FaPlusCircle />} <h4>Paciente</h4></div>
                                    <div className="input-grid">
                                        <input type="text" placeholder="Nombre Mascota" value={petForm.petName} onChange={e => setPetForm({...petForm, petName: e.target.value})} required />
                                        <input type="text" placeholder="Raza" value={petForm.breed} onChange={e => setPetForm({...petForm, breed: e.target.value})} required />
                                        <input type="number" placeholder="Peso (kg)" value={petForm.weight} onChange={e => setPetForm({...petForm, weight: e.target.value})} required />
                                        <select value={petForm.ownerId} onChange={e => setPetForm({...petForm, ownerId: e.target.value})} required>
                                            <option value="">Seleccionar Dueño...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <textarea placeholder="Notas médicas y observaciones..." value={petForm.notes} onChange={e => setPetForm({...petForm, notes: e.target.value})} />
                                    </div>
                                    <div className="btn-group">
                                        <button type="submit" className="main-action-btn">{editingId ? 'Actualizar' : 'Registrar'}</button>
                                        {editingId && <button onClick={cancelEdit} className="cancel-btn">Cancelar</button>}
                                    </div>
                                </form>
                                <div className="patient-gallery">
                                    {pets.map(p => (
                                        <div key={p.id} className="pet-capsule-card">
                                            <div className="pet-info">
                                                <h4>{p.petName} <span>({p.weight}kg)</span></h4>
                                                <p>{p.breed} • {clients.find(c => String(c.id) === String(p.ownerId))?.name || 'S/D'}</p>
                                            </div>
                                            <div className="actions-cell">
                                                <button onClick={() => startEdit('pet', p)} className="edit-btn"><FaEdit /></button>
                                                <button onClick={() => deletePet(p.id)} className="delete-btn"><FaTrash /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <aside className="pacientes-agenda-side">
                                <div className="agenda-header-container">
                                    <div className="agenda-header-text">
                                        <FaCalendarAlt /> <h4>Agenda</h4>
                                    </div>
                                    <button className="add-appo-btn" onClick={() => setShowAppoForm(!showAppoForm)}>
                                        <FaPlusCircle />
                                    </button>
                                </div>

                                {showAppoForm && (
                                    <form className="mini-appo-form fade-in" onSubmit={handleAddAppointment}>
                                        <select value={appoForm.petId} onChange={e => setAppoForm({...appoForm, petId: e.target.value})} required>
                                            <option value="">¿Quién viene?</option>
                                            {pets.map(p => <option key={p.id} value={p.id}>{p.petName}</option>)}
                                        </select>
                                        <input type="time" value={appoForm.time} onChange={e => setAppoForm({...appoForm, time: e.target.value})} required />
                                        <input type="text" placeholder="Servicio" value={appoForm.service} onChange={e => setAppoForm({...appoForm, service: e.target.value})} required />
                                        <button type="submit" className="main-action-btn sm">Agendar</button>
                                    </form>
                                )}

                                <div className="agenda-list">
                                    {appointments.length === 0 && <p className="empty-msg">No hay citas agendadas hoy.</p>}
                                    {appointments.sort((a,b) => a.time.localeCompare(b.time)).map(appo => {
                                        const pet = pets.find(p => String(p.id) === String(appo.petId));
                                        return (
                                            <div key={appo.id} className={`agenda-item-v2 ${selectedAppointment?.id === appo.id ? 'active' : ''}`} onClick={() => setSelectedAppointment(appo)}>
                                                <div className="time-tag"><FaClock /> {appo.time}</div>
                                                <div className="appo-body">
                                                    <strong>{pet?.petName || 'Paciente'}</strong>
                                                    <span>{appo.service}</span>
                                                </div>
                                                <button className="del-appo" onClick={(e) => {e.stopPropagation(); deleteAppointment(appo.id)}}><FaTrash /></button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {selectedAppointment && (
                                    <div className="quick-file-v2 fade-in">
                                        <div className="file-header"><FaNotesMedical /> <h5>Expediente Rápido</h5></div>
                                        {(() => {
                                            const pet = pets.find(p => String(p.id) === String(selectedAppointment.petId));
                                            const owner = clients.find(c => String(c.id) === String(pet?.ownerId));
                                            return (
                                                <div className="file-card-inner">
                                                    <p><strong>Paciente:</strong> {pet?.petName} ({pet?.breed})</p>
                                                    <p><strong>Responsable:</strong> {owner?.name}</p>
                                                    <div className="notes-box">
                                                        <p>{pet?.notes || 'Sin notas.'}</p>
                                                    </div>
                                                    <button className="main-action-btn sm" onClick={() => startEdit('pet', pet)}>Editar Expediente</button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </aside>
                        </div>
                    )}

                    {/* SERVICIOS */}
                    {tab === 'servicios' && (
                        <div className="fade-in">
                            <form onSubmit={(e) => handleSave('service', e)} className={`dashboard-form ${editingId ? 'edit-mode' : ''}`}>
                                <div className="form-header"><FaPlusCircle /> <h4>Servicio</h4></div>
                                <div className="input-grid">
                                    <input type="text" placeholder="Título" value={serviceForm.title} onChange={e => setServiceForm({...serviceForm, title: e.target.value})} required />
                                    <input type="number" placeholder="Precio" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} required />
                                    <input type="text" placeholder="Duración" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})} required />
                                    <textarea placeholder="Descripción..." value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} required />
                                </div>
                                <div className="btn-group">
                                    <button type="submit" className="main-action-btn">{editingId ? 'Actualizar' : 'Guardar'}</button>
                                    {editingId && <button onClick={cancelEdit} className="cancel-btn">Cancelar</button>}
                                </div>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Servicio</th><th>Duración</th><th>Precio</th><th>Acciones</th></tr></thead>
                                    <tbody>{services.map(s => (
                                        <tr key={s.id}><td>{s.title}</td><td>{s.duration}</td><td>${s.price}</td>
                                        <td className="actions-cell">
                                            <button onClick={() => startEdit('service', s)} className="edit-btn"><FaEdit /></button>
                                            <button onClick={() => deleteService(s.id)} className="delete-btn"><FaTrash /></button>
                                        </td></tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PRODUCTOS */}
                    {tab === 'productos' && (
                        <div className="fade-in">
                            <form onSubmit={(e) => handleSave('product', e)} className={`dashboard-form ${editingId ? 'edit-mode' : ''}`}>
                                <div className="form-header"><FaPlusCircle /> <h4>Producto</h4></div>
                                <div className="input-grid">
                                    <input type="text" placeholder="Nombre" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                                    <input type="number" placeholder="Precio" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
                                    <input type="number" placeholder="Stock" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} required />
                                    <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} required>
                                        <option value="Alimentos">Alimentos</option>
                                        <option value="Higiene">Higiene</option>
                                        <option value="Accesorios">Accesorios</option>
                                    </select>
                                </div>
                                <div className="btn-group">
                                    <button type="submit" className="main-action-btn">{editingId ? 'Actualizar' : 'Guardar'}</button>
                                    {editingId && <button onClick={cancelEdit} className="cancel-btn">Cancelar</button>}
                                </div>
                            </form>
                            <div className="data-table-container">
                                <table>
                                    <thead><tr><th>Producto</th><th>Stock</th><th>Precio</th><th>Acciones</th></tr></thead>
                                    <tbody>{products.map(p => (
                                        <tr key={p.id}><td>{p.name}</td><td>{p.stock}</td><td>${p.price}</td>
                                        <td className="actions-cell">
                                            <button onClick={() => startEdit('product', p)} className="edit-btn"><FaEdit /></button>
                                            <button onClick={() => deleteProduct(p.id)} className="delete-btn"><FaTrash /></button>
                                        </td></tr>
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

export default AdminDashboard;