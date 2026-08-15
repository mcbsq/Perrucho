// src/components/platform/PlatformBackground.jsx
//
// Fondo persistente de las páginas de plataforma — no solo el hero. Dos
// capas: manchas de gradiente muy suaves que derivan lentamente (le dan
// vida sin competir con el contenido) y una textura de grano fina encima
// (evita el plano/plástico de un fondo blanco liso). Fixed + pointer-events
// none: vive detrás de todo, nunca intercepta clics ni compite con el
// contraste del texto (opacidades bajas a propósito).
import React from 'react';
import './PlatformBackground.css';

const PlatformBackground = () => (
    <div className="pbg" aria-hidden="true">
        <div className="pbg-blob pbg-blob--a" />
        <div className="pbg-blob pbg-blob--b" />
        <div className="pbg-blob pbg-blob--c" />
        <div className="pbg-grain" />
    </div>
);

export default PlatformBackground;
