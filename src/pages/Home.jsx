// src/pages/Home.jsx (CONECTADO AL ADMIN)
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css'; 
import bannerImage from '../assets/1.jpg'; 
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext'; // <-- CONEXIÓN AL ADMIN

// --- TARJETA DINÁMICA ---
// Adaptamos la tarjeta para recibir los datos reales del objeto del Admin
const DynamicCard = ({ item, type }) => {
    const { isLoggedIn } = useAuth();
    
    // Si es servicio va a /servicios, si es producto a /tienda
    const baseLink = type === 'service' ? "/servicios" : "/tienda";
    const linkPath = isLoggedIn ? baseLink : "/acceso";
    
    // Iconos por defecto según categoría o tipo
    const icon = type === 'service' ? "✂️" : "🎁";

    return (
        <div className={`service-card ${type === 'product' ? 'product-card' : ''}`}>
            <div className={`service-icon ${type === 'product' ? 'product-icon' : ''}`}>
                {icon}
            </div>
            <h3>{item.title || item.name}</h3>
            <p>{item.description || `Categoría: ${item.category}`}</p>
            {type === 'service' && <span className="price-tag">${item.price}</span>}
            
            <Link to={linkPath} className={`reserve-button ${type === 'service' ? 'service-button' : 'buy-button'}`}>
                {type === 'service' ? 'Reservar' : 'Comprar'}
            </Link>
        </div>
    );
};

const Home = () => {
    const { isLoggedIn, user } = useAuth();
    const { services, products } = useData(); // <-- EXTRAEMOS DATOS REALES
    const [userName, setUserName] = useState("");

    useEffect(() => {
        const savedUser = localStorage.getItem('user_data');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUserName(parsedUser.name || "Invitado");
        } else if (user) {
            setUserName(user.name);
        }
    }, [user]);

    const mainReservePath = isLoggedIn ? "/servicios" : "/acceso";

    return (
        <div className="home-page-container">
            
            {/* BANNER */}
            <div 
                className="capsule-banner" 
                style={{ backgroundImage: `url(${bannerImage})` }}
            >
              
                <Link to={mainReservePath} className="reserve-button">
                    Reservar Cita
                </Link>
            </div>

            {/* SECCIÓN SERVICIOS (DINÁMICOS) */}
            <section className="content-section">
                <h3>Nuestros Servicios</h3>
                <div className="service-cards-grid">
                    {services.length > 0 ? (
                        services.slice(0, 3).map(s => (
                            <DynamicCard key={s.id} item={s} type="service" />
                        ))
                    ) : (
                        <p className="empty-msg">Cargando servicios profesionales...</p>
                    )}
                </div>
            </section>

            {/* SECCIÓN PRODUCTOS (DINÁMICOS) */}
            <section className="content-section">
                <h3>Productos Destacados</h3>
                <div className="service-cards-grid">
                    {products.length > 0 ? (
                        products.slice(0, 3).map(p => (
                            <DynamicCard key={p.id} item={p} type="product" />
                        ))
                    ) : (
                        <p className="empty-msg">Cargando productos exclusivos...</p>
                    )}
                </div>
            </section>

            <div className="spacer-gradient"></div>
        </div>
    );
};

export default Home;