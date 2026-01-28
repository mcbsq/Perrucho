import React from 'react';
import { Link } from 'react-router-dom'; // <--- ¡Añadir esta línea!
import './Footer.css'; 

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <p>🐾 Mascotas S.A. | Todos los derechos reservados {new Date().getFullYear()}.</p>
        <div className="footer-links">
          <Link to="/aviso" className="footer-link">Aviso de Privacidad</Link>
          <Link to="/terminos" className="footer-link">Términos y Condiciones</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;