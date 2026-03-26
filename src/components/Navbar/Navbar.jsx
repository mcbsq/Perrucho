// src/components/Navbar/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../../contexts/AuthContext';

// --- ICONOS SVG ---
const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);

const ProfileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
);

const Navbar = () => {
    const { user, isLoggedIn, logout } = useAuth();
    const location  = useLocation();
    const navigate  = useNavigate();

    const [scrolled,         setScrolled]         = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Detectar scroll
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleHomeClick = (e) => {
        if (location.pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const navbarClasses = [
        'navbar-container',
        scrolled ? 'scrolled-capsule' : 'top-transparent',
        isMobileMenuOpen ? 'menu-open' : '',
    ].join(' ');

    // Helper para clases activas con NavLink
    const navClass = ({ isActive }) =>
        isActive ? 'nav-item nav-item--active' : 'nav-item';

    return (
        <header className={navbarClasses}>
            <div className="navbar-content">

                {/* Logo */}
                <NavLink to="/" className="navbar-logo" onClick={handleHomeClick}>
                    perrucho<span>.</span>
                </NavLink>

                {/* Desktop nav */}
                <nav className="nav-links-desktop">
                    <NavLink to="/"         className={navClass} onClick={handleHomeClick} end>Inicio</NavLink>
                    <NavLink to="/servicios" className={navClass}>Servicios</NavLink>
                    <NavLink to="/tienda"    className={navClass}>Tienda</NavLink>
                    <NavLink to="/contacto"  className={navClass}>Contacto</NavLink>
                </nav>

                {/* Acciones */}
                <div className="navbar-actions">
                    {isLoggedIn ? (
                        <>
                            <span className="user-greeting">
                                Hola, <strong>{user.name.split(' ')[0]}</strong>
                            </span>
                            <NavLink to="/perfil" className="nav-icon" title="Mi Perfil">
                                <ProfileIcon />
                            </NavLink>
                            <button className="nav-icon nav-icon--logout" title="Cerrar Sesión" onClick={handleLogout}>
                                <LogoutIcon />
                            </button>
                        </>
                    ) : (
                        <NavLink to="/acceso" className="nav-access-btn">
                            <UserIcon />
                            <span>Acceder</span>
                        </NavLink>
                    )}

                    {/* Toggle móvil */}
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setIsMobileMenuOpen(prev => !prev)}
                        aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                    >
                        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </div>

            {/* Menú Móvil */}
            <nav className={`nav-links-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
                <NavLink to="/"          className={navClass} onClick={handleHomeClick} end>Inicio</NavLink>
                <NavLink to="/servicios" className={navClass}>Servicios</NavLink>
                <NavLink to="/tienda"    className={navClass}>Tienda</NavLink>
                <NavLink to="/contacto"  className={navClass}>Contacto</NavLink>

                {isLoggedIn ? (
                    <>
                        <NavLink to="/perfil" className={navClass}>Mi Perfil</NavLink>
                        <button className="nav-item nav-item--logout-mobile" onClick={handleLogout}>
                            Cerrar sesión ({user.name.split(' ')[0]})
                        </button>
                    </>
                ) : (
                    <NavLink to="/acceso" className="nav-item nav-item--access">
                        Iniciar sesión
                    </NavLink>
                )}
            </nav>
        </header>
    );
};

export default Navbar;