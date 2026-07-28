// src/components/shared/OnboardingTour.jsx
//
// Recorrido guiado para usuarios nuevos (punto del feedback del cliente:
// "nubes de texto que te guíen paso a paso el cómo utilizarlo").
// Se muestra automáticamente una sola vez por usuario (localStorage) la
// primera vez que entra al panel, y puede reabrirse con el botón "?".
import React, { useState, useEffect } from 'react';
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

export const OnboardingTour = ({ steps, onClose }) => {
    const [i, setI] = useState(0);
    const step = steps[i];
    const isLast = i === steps.length - 1;

    return (
        <div className="onboarding-overlay" onClick={onClose}>
            <div className="onboarding-card" onClick={e => e.stopPropagation()}>
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
        </div>
    );
};
