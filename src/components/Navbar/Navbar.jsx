// src/components/Navbar/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

// Importamos el hook de autenticación
import { useAuth } from '../../contexts/AuthContext'; 

// --- ICONOS SVG ---
const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
);
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
);
// Icono de Salir
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
);
// --------------------------------------------------------

const Navbar = () => {
  // --- Autenticación ---
  const { user, isLoggedIn, logout } = useAuth(); // <-- Obtenemos el estado y la función

  // Hooks de React Router DOM
  const location = useLocation(); 
  const navigate = useNavigate(); 

  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lógica de Scroll (sin cambios)
  const handleScroll = () => {
    setScrolled(window.scrollY > 100); 
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); 

  // Función de Logout
  const handleLogout = () => {
    logout(); // Llama a la función de logout del Context
    navigate('/'); // Redirige a la página de inicio
    closeMobileMenu();
  };

  const handleHomeClick = (e) => {
    e.preventDefault(); 
    closeMobileMenu();

    if (location.pathname === '/') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth' 
      });
    } else {
      navigate('/');
      setTimeout(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
      }, 50); 
    }
  };

  const navbarClasses = `navbar-container ${scrolled ? 'scrolled-capsule' : 'top-transparent'} ${isMobileMenuOpen ? 'menu-open' : ''}`;

  const closeMobileMenu = () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className={navbarClasses}>
      <div className="navbar-content">
        {/* Logo/Nombre de la Marca */}
        <Link to="/" className="navbar-logo" onClick={handleHomeClick}>
          MASCOTAS
        </Link>

        {/* Links de Navegación (Desktop) */}
        <nav className={`nav-links-desktop`}>
          <Link to="/" className="nav-item" onClick={handleHomeClick}>Inicio</Link> 
          <Link to="/servicios" className="nav-item">Servicios</Link>
          <Link to="/tienda" className="nav-item">Tienda</Link>
          <Link to="/contacto" className="nav-item">Contacto</Link>
        </nav>
        
        {/* Botones de Acción */}
        <div className="navbar-actions">
          
          {isLoggedIn ? (
            // SI ESTÁ LOGEADO: Muestra el nombre y el botón de Logout
            <>
              {/* Nombre del Usuario (Opcional) */}
              <span className="user-greeting">Hola, {user.name.split(' ')[0]}</span>
              
              {/* Botón de Perfil (o Logout) */}
              <button className="nav-icon logout-button" title="Cerrar Sesión" onClick={handleLogout}>
                <LogoutIcon />
              </button>
            </>
          ) : (
            // SI NO ESTÁ LOGEADO: Muestra el ícono de Login
            <Link to="/acceso" className="nav-icon" title="Iniciar Sesión" onClick={closeMobileMenu}>
              <UserIcon />
            </Link>
          )}
          
          {/* Botón de Menú Móvil */}
          <button 
            className="mobile-menu-toggle" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      <nav className={`nav-links-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
        <Link to="/" className="nav-item" onClick={handleHomeClick}>Inicio</Link>
        <Link to="/servicios" className="nav-item" onClick={closeMobileMenu}>Servicios</Link>
        <Link to="/tienda" className="nav-item" onClick={closeMobileMenu}>Tienda</Link>
        <Link to="/contacto" className="nav-item" onClick={closeMobileMenu}>Contacto</Link>
        
        {/* Enlace de Acceso/Logout en Móvil */}
        {isLoggedIn ? (
            <button className="nav-item access-link" onClick={handleLogout}>
                Cerrar Sesión ({user.name.split(' ')[0]})
            </button>
        ) : (
            <Link to="/acceso" className="nav-item access-link" onClick={closeMobileMenu}>
                Iniciar Sesión
            </Link>
        )}

      </nav>
    </header>
  );
};

export default Navbar;