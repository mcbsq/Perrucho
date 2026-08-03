// src/components/shared/OnboardingTour.jsx
//
// Recorrido guiado para usuarios nuevos (punto del feedback del cliente:
// "nubes de texto que te guíen paso a paso el cómo utilizarlo").
// Se muestra automáticamente una sola vez por usuario (localStorage) la
// primera vez que entra al panel — que para una cuenta recién creada es
// justo al terminar el registro/alta — y puede reabrirse con el botón "?".
//
// Cada paso puede traer un `target` (selector CSS de un elemento con
// data-tour="..."): si lo trae, el mensaje se ancla junto a ese elemento
// real de la pantalla y se recorta un "spotlight" que lo deja iluminado
// mientras el resto de la pantalla se oscurece; si no lo trae, se muestra
// como tarjeta centrada (usado para el paso de bienvenida/cierre).
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { FaTimes, FaQuestionCircle } from 'react-icons/fa';
import './OnboardingTour.css';

const seenKey = (storageKey, userId) => `perrucho_onboarding_${storageKey}_${userId}`;

export const useOnboarding = (storageKey, userId) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!userId) return;
        const seen = localStorage.getItem(seenKey(storageKey, userId));
        if (!seen) setShow(true);
    }, [storageKey, userId]);

    const dismiss = () => {
        if (userId) localStorage.setItem(seenKey(storageKey, userId), '1');
        setShow(false);
    };
    const reopen = () => setShow(true);

    return { show, dismiss, reopen };
};

export const OnboardingHelpButton = ({ onClick }) => (
    <button type="button" className="onboarding-help-btn" onClick={onClick} title="Ver guía de uso">
        <FaQuestionCircle />
    </button>
);

const GAP = 14; // separación entre el elemento resaltado y la tarjeta

const useTargetRect = (selector) => {
    const [rect, setRect] = useState(null);

    useLayoutEffect(() => {
        if (!selector) { setRect(null); return; }
        const el = document.querySelector(selector);
        if (!el) { setRect(null); return; }

        el.scrollIntoView({ block: 'center', behavior: 'smooth' });

        // Si el elemento existe pero está oculto (p.ej. el menú de escritorio
        // colapsado en pantallas angostas), no hay nada que anclar — cae al
        // recuadro centrado en vez de dibujar un spotlight en 0,0.
        const measure = () => {
            const r = el.getBoundingClientRect();
            setRect(r.width > 0 && r.height > 0 ? r : null);
        };
        measure();
        // Vuelve a medir tras el scroll suave y en resize/scroll de la página.
        const t = setTimeout(measure, 300);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [selector]);

    return rect;
};

// Calcula dónde poner la tarjeta (abajo/arriba/lado del elemento) sin salirse
// del viewport.
const cardPosition = (rect, cardW = 320, cardH = 200) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    let top, left;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow >= cardH + GAP || spaceBelow >= spaceAbove) {
        top = Math.min(rect.bottom + GAP, vh - cardH - 12);
    } else {
        top = Math.max(rect.top - cardH - GAP, 12);
    }
    left = rect.left + rect.width / 2 - cardW / 2;
    left = Math.max(12, Math.min(left, vw - cardW - 12));

    return { top, left };
};

export const OnboardingTour = ({ steps, onClose }) => {
    const [i, setI] = useState(0);
    const step = steps[i];
    const isLast = i === steps.length - 1;
    const rect = useTargetRect(step.target);

    const card = (
        <div className={`onboarding-card ${rect ? 'onboarding-card--anchored' : ''}`}
            style={rect ? { position: 'fixed', ...cardPosition(rect), margin: 0 } : undefined}
            onClick={e => e.stopPropagation()}>
            <button className="onboarding-close" onClick={onClose}><FaTimes /></button>
            <div className="onboarding-icon">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <div className="onboarding-dots">
                {steps.map((_, idx) => <span key={idx} className={`onboarding-dot ${idx === i ? 'active' : ''}`} />)}
            </div>
            <div className="onboarding-actions">
                <button type="button" className="onboarding-skip" onClick={onClose}>Saltar</button>
                {i > 0 && <button type="button" className="onboarding-btn onboarding-btn--secondary" onClick={() => setI(i - 1)}>← Atrás</button>}
                <button type="button" className="onboarding-btn onboarding-btn--primary" onClick={() => isLast ? onClose() : setI(i + 1)}>
                    {isLast ? '¡Entendido!' : 'Siguiente →'}
                </button>
            </div>
        </div>
    );

    return (
        <div className={`onboarding-overlay ${rect ? 'onboarding-overlay--spotlight' : ''}`} onClick={onClose}>
            {rect && (
                <div
                    className="onboarding-spotlight"
                    style={{
                        top: rect.top - 6, left: rect.left - 6,
                        width: rect.width + 12, height: rect.height + 12,
                    }}
                />
            )}
            {card}
        </div>
    );
};
