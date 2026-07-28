// src/utils/theme.js
//
// Aplica el "Color principal" configurado en Personalización (Settings.primaryColor)
// como variables CSS globales, para que realmente afecte la interfaz (bug reportado
// por el cliente: elegir un color no generaba ningún cambio visible).
//
// tokens.css define --color-accent/--color-accent-dark leyendo estas variables
// con fallback a los valores por defecto, así que sobreescribirlas aquí se
// propaga automáticamente a todo lo que ya usa var(--color-accent).

const clamp = (n) => Math.max(0, Math.min(255, n));

const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};

const rgbToHex = ({ r, g, b }) =>
    '#' + [r, g, b].map(v => clamp(Math.round(v)).toString(16).padStart(2, '0')).join('');

// amount > 0 aclara, amount < 0 oscurece (rango -1..1)
const shade = (hex, amount) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const target = amount > 0 ? 255 : 0;
    const p = Math.abs(amount);
    return rgbToHex({
        r: rgb.r + (target - rgb.r) * p,
        g: rgb.g + (target - rgb.g) * p,
        b: rgb.b + (target - rgb.b) * p,
    });
};

// --accent-blue se define aparte (en AdminDashboard.css/EmployeeDashboard.css)
// y lo usa el Navbar público — se sobreescribe aquí también, con estilo
// inline en <html>, para que gane pase lo que pase el orden de los CSS.
const VARS = ['--brand-primary', '--accent-blue', '--color-accent'];
const VARS_DARK = ['--brand-primary-dark', '--color-accent-dark'];

export const applyBrandColor = (primaryColor) => {
    const root = document.documentElement.style;
    if (!primaryColor || !hexToRgb(primaryColor)) {
        [...VARS, ...VARS_DARK, '--brand-primary-light'].forEach(v => root.removeProperty(v));
        return;
    }
    VARS.forEach(v => root.setProperty(v, primaryColor));
    VARS_DARK.forEach(v => root.setProperty(v, shade(primaryColor, -0.28)));
    root.setProperty('--brand-primary-light', shade(primaryColor, 0.35));
};
