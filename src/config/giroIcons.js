// src/config/giroIcons.js
//
// Ícono por giro — puramente decorativo (componentes de React, por eso
// vive separado de giroPresets.js/giroMarketing.js, que sí cruzan al
// backend/no deberían cargar react-icons). Compartido entre
// PerruchoLanding.jsx y GiroLanding.jsx para no mantener el mismo mapa
// duplicado en los dos archivos.
import {
    PiPawPrintBold, PiPaintBrushBold, PiMagicWandBold, PiFlowerLotusBold,
    PiScissorsBold, PiStethoscopeBold, PiBarbellBold, PiCalendarCheckBold,
    PiCoffeeBold,
} from 'react-icons/pi';

export const GIRO_ICONS = {
    mascotas: PiPawPrintBold,
    unas: PiPaintBrushBold,
    pestanas: PiMagicWandBold,
    spa: PiFlowerLotusBold,
    barberia: PiScissorsBold,
    clinica: PiStethoscopeBold,
    gimnasio: PiBarbellBold,
    alimentos: PiCoffeeBold,
};

export const getGiroIcon = (giro) => GIRO_ICONS[giro] || PiCalendarCheckBold;
