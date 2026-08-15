// src/components/platform/PlatformNav.jsx
//
// Nav flotante compartida por las páginas de plataforma (landing general,
// landing por giro) — reemplaza el header de ancho completo de antes.
// Un solo CTA integrado en vez de un botón flotante aparte: menos ruido
// visual que dos elementos flotantes compitiendo por atención.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PiArrowRightBold } from 'react-icons/pi';
import perruchoMark from '../../assets/perrucho-mark.svg';
import './PlatformNav.css';

// giro opcional: si la nav vive en una landing de giro, el CTA lleva el
// giro preseleccionado al alta en vez de mandar a elegirlo de cero.
const PlatformNav = ({ giro }) => {
    const [condensed, setCondensed] = useState(false);

    useEffect(() => {
        const onScroll = () => setCondensed(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const registerHref = giro ? `/crear-negocio?giro=${giro}` : '/crear-negocio';

    return (
        <div className={`pnav-wrap${condensed ? ' is-condensed' : ''}`}>
            <nav className="pnav">
                <Link to="/" className="pnav-brand">
                    <img src={perruchoMark} alt="" className="pnav-mark" />
                    <span>Emporio</span>
                </Link>
                <Link to={registerHref} className="pnav-cta">
                    <span className="pnav-cta-full">Registrar mi negocio</span>
                    <span className="pnav-cta-short">Registrar</span>
                    <PiArrowRightBold />
                </Link>
            </nav>
        </div>
    );
};

export default PlatformNav;
