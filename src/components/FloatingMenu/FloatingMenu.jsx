// src/components/FloatingMenu/FloatingMenu.jsx
//
// Antes había dos botones flotantes independientes (WhatsApp + Chatbot)
// compitiendo por el mismo rincón de la pantalla. Se combinan en un solo
// FAB que se expande en un menú tipo burbuja con las dos opciones —
// feedback del cliente: "que estén en un menú desplegable tipo burbuja".
import React, { useState } from 'react';
import { FaWhatsapp, FaCommentDots, FaPlus } from 'react-icons/fa';
import Chatbot from '../Chatbot/Chatbot';
import './FloatingMenu.css';

const FloatingMenu = ({ whatsappNumber, whatsappMessage }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    return (
        <>
            <Chatbot isOpen={chatOpen} onOpenChange={setChatOpen} hideFab />

            <div className={`fm-wrap ${menuOpen ? 'fm-wrap--open' : ''}`}>
                <div className="fm-options">
                    <a
                        href={waUrl} target="_blank" rel="noopener noreferrer"
                        className="fm-option fm-option--whatsapp"
                        onClick={() => setMenuOpen(false)}
                    >
                        <span className="fm-option-label">WhatsApp</span>
                        <span className="fm-option-icon"><FaWhatsapp /></span>
                    </a>
                    <button
                        type="button"
                        className="fm-option fm-option--chat"
                        onClick={() => { setChatOpen(true); setMenuOpen(false); }}
                    >
                        <span className="fm-option-label">Asistente</span>
                        <span className="fm-option-icon"><FaCommentDots /></span>
                    </button>
                </div>

                <button
                    type="button"
                    className="fm-main-btn"
                    onClick={() => setMenuOpen(v => !v)}
                    aria-label={menuOpen ? 'Cerrar menú de ayuda' : 'Abrir menú de ayuda'}
                    aria-expanded={menuOpen}
                >
                    <FaPlus className="fm-main-icon" />
                </button>
            </div>
        </>
    );
};

export default FloatingMenu;
