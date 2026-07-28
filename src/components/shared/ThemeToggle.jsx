// src/components/shared/ThemeToggle.jsx
import React, { useState, useEffect } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { resolveInitialTheme, setUserTheme } from '../../utils/theme';

const ThemeToggle = ({ className = '' }) => {
    const [mode, setMode] = useState(() =>
        document.documentElement.getAttribute('data-theme') || resolveInitialTheme()
    );

    useEffect(() => {
        setUserTheme(mode);
    }, [mode]);

    return (
        <button
            type="button"
            className={`theme-toggle-btn ${className}`}
            onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')}
            title={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
        >
            {mode === 'dark' ? <FaSun /> : <FaMoon />}
        </button>
    );
};

export default ThemeToggle;
