// src/pages/Home.jsx (Actualizado)
import React from 'react';
import { Link } from 'react-router-dom';
import './styles.css'; 
import bannerImage from '../assets/1.jpg'; 
import { useAuth } from '../contexts/AuthContext'; // <-- ¡IMPORTAMOS EL HOOK!

// --- COMPONENTE TARJETA DE SERVICIO ---
const ServiceCard = ({ title, description, icon }) => {
    // Usamos el hook para acceder al estado
    const { isLoggedIn } = useAuth(); 
    
    // Lógica Condicional REAL
    const linkPath = isLoggedIn ? "/servicios" : "/acceso";
    
    return (
        <div className="service-card">
            <div className="service-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
            <Link to={linkPath} className="reserve-button service-button">
                Reservar
            </Link>
        </div>
    );
};

// --- COMPONENTE TARJETA DE PRODUCTO ---
const ProductCard = ({ title, description, icon }) => {
    // Usamos el hook para acceder al estado
    const { isLoggedIn } = useAuth();
    
    // Lógica Condicional REAL
    const linkPath = isLoggedIn ? "/tienda" : "/acceso";
    
    return (
        <div className="service-card product-card"> 
            <div className="service-icon product-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
            <Link to={linkPath} className="reserve-button buy-button"> 
                Comprar
            </Link>
        </div>
    );
};
// --------------------------------------------------------------------------


const Home = () => {
    // Usamos el hook en el componente principal
    const { isLoggedIn } = useAuth();
    
    // Rutas condicionales para los botones principales
    const mainReservePath = isLoggedIn ? "/servicios" : "/acceso";
    const shopLinkPath = isLoggedIn ? "/tienda" : "/acceso";
    
    return (
        <div className="home-page-container" style={{ minHeight: '200vh', paddingBottom: '100px' }}>
            
            {/* BANNER CAPSULA FLOTANTE */}
            <div 
                className="capsule-banner" 
                style={{ backgroundImage: `url(${bannerImage})` }}
            >
                
                <Link to={mainReservePath} className="reserve-button">
                    Reservar Cita
                </Link>
            </div>

            {/* SECCIÓN SERVICIOS */}
            <section className="content-section">
                <h3>Nuestros Servicios</h3>
                <div className="service-cards-grid">
                    <ServiceCard title="Grooming Premium" description="..." icon="✂️"/>
                    <ServiceCard title="Spa & Relax" description="..." icon="🛁"/>
                    <ServiceCard title="Chequeo Básico" description="..." icon="🩺"/>
                </div>
            </section>

            {/* SECCIÓN PRODUCTOS EXCLUSIVOS */}
            <section className="content-section">
                <h3>Productos Exclusivos</h3>
                <div className="service-cards-grid">
                    <ProductCard title="Shampoo Hipoalergénico" description="..." icon="🧴"/>
                    <ProductCard title="Juguete Interactivo" description="..." icon="🦴"/>
                    <ProductCard title="Alimento Premium" description="..." icon="🥩"/>
                </div>
                
               
            </section>

            <div style={{ height: '200px' }}></div> 
        </div>
    );
};

export default Home;