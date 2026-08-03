// src/utils/serviceIcons.jsx
//
// Reemplaza los emojis usados como "ícono de servicio" (✂️🛁🐾📅 etc.) por
// una librería de iconos real (Phosphor, vía react-icons) — feedback del
// cliente: los emojis se ven genéricos/inconsistentes entre sistemas
// operativos. Los servicios/categorías siguen siendo texto libre en la base
// de datos (título, categoría) — este helper solo decide QUÉ ícono mostrar
// a partir de esas palabras, sin necesidad de migrar datos existentes.
import {
    PiScissorsBold, PiBathtubBold, PiPawPrintBold, PiDropBold,
    PiBoneBold, PiShoppingBagBold, PiCalendarCheckBold, PiStarBold,
    PiTrophyBold, PiSmileyBold, PiStethoscopeBold, PiHouseBold,
    PiFootprintsBold, PiSparkleBold, PiHeartBold, PiTagBold,
    PiPackageBold, PiTShirtBold, PiPillBold, PiSoccerBallBold,
} from 'react-icons/pi';

// Orden importa: la primera coincidencia gana, de más específico a más genérico.
const RULES = [
    [/ba(ñ|n)o/i,                         PiBathtubBold],
    [/(corte|grooming|estetic|estétic|peluquer|tijera)/i, PiScissorsBold],
    [/(paseo|caminata)/i,                 PiFootprintsBold],
    [/(guarder|hospedaje|estad[ií]a)/i,   PiHouseBold],
    [/(consulta|m[eé]dic|veterinari|salud)/i, PiStethoscopeBold],
    [/(higien|limpieza|desparasit)/i,      PiDropBold],
    [/(farmaci|medicin|pastilla)/i,        PiPillBold],
    [/(juguete|game|toy)/i,                PiSoccerBallBold],
    [/(aliment|comida|croqueta|snack)/i,  PiBoneBold],
    [/(ropa|accesorio|correa|collar)/i,   PiTShirtBold],
    [/(producto|tienda|shop)/i,            PiShoppingBagBold],
    [/(agenda|cita|reserva|calendari)/i,  PiCalendarCheckBold],
    [/(client|feliz|content)/i,            PiSmileyBold],
    [/(calificaci|estrella|rese[ñn]a)/i,  PiStarBold],
    [/(experiencia|a[ñn]os|trofeo|premio)/i, PiTrophyBold],
    [/(especialist|equipo|personal)/i,    PiHeartBold],
    [/(paquete|promoci|oferta)/i,          PiTagBold],
    [/(env[ií]o|entrega|domicilio)/i,     PiPackageBold],
];

// Devuelve un componente de ícono (no un elemento) — el caller lo renderiza
// como <Icon /> para poder pasarle tamaño/color por props.
export const getServiceIcon = (text) => {
    const str = String(text || '');
    for (const [pattern, Icon] of RULES) {
        if (pattern.test(str)) return Icon;
    }
    return PiSparkleBold; // fallback genérico pero con carácter, no una huella repetida de más
};

// Ícono de respaldo explícito para "paseo/mascota" en vez de PiSparkleBold,
// usado cuando el contexto es claramente sobre la mascota en sí.
export const PawIcon = PiPawPrintBold;
