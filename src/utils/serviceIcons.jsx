// src/utils/serviceIcons.jsx
//
// Reemplaza los emojis usados como "ícono de servicio" (✂️🛁🐾📅 etc.) por
// una librería de iconos real (Phosphor, vía react-icons) — feedback del
// cliente: los emojis se ven genéricos/inconsistentes entre sistemas
// operativos. Los servicios/categorías siguen siendo texto libre en la base
// de datos (título, categoría) — este helper solo decide QUÉ ícono mostrar
// a partir de esas palabras, sin necesidad de migrar datos existentes.
//
// Multi-tenant: cada giro de negocio (src/config/giroPresets.js) trae su
// propio set de palabras clave — un negocio de uñas/pestañas no tiene
// servicios de "baño" o "paseo", así que buscarlos ahí siempre caería al
// ícono genérico. `getServiceIcon(text, rulesetKey)` recibe el ruleset a
// usar (por defecto "pets", igual que antes de multi-tenant).
import {
    PiScissorsBold, PiBathtubBold, PiPawPrintBold, PiDropBold,
    PiBoneBold, PiShoppingBagBold, PiCalendarCheckBold, PiStarBold,
    PiTrophyBold, PiSmileyBold, PiStethoscopeBold, PiHouseBold,
    PiFootprintsBold, PiSparkleBold, PiHeartBold, PiTagBold,
    PiPackageBold, PiTShirtBold, PiPillBold, PiSoccerBallBold,
    PiPaintBrushBold, PiMagicWandBold, PiFlowerLotusBold, PiSunBold,
    PiCoffeeBold, PiHamburgerBold, PiPizzaBold, PiCakeBold, PiWineBold,
    PiBowlFoodBold, PiTableBold,
} from 'react-icons/pi';

// Reglas compartidas por cualquier giro (agenda, servicio al cliente, marketing).
const SHARED_RULES = [
    [/(agenda|cita|reserva|calendari)/i,  PiCalendarCheckBold],
    [/(client|feliz|content)/i,            PiSmileyBold],
    [/(calificaci|estrella|rese[ñn]a)/i,  PiStarBold],
    [/(experiencia|a[ñn]os|trofeo|premio)/i, PiTrophyBold],
    [/(especialist|equipo|personal)/i,    PiHeartBold],
    [/(paquete|promoci|oferta)/i,          PiTagBold],
    [/(env[ií]o|entrega|domicilio)/i,     PiPackageBold],
    [/(producto|tienda|shop)/i,            PiShoppingBagBold],
];

// Orden importa dentro de cada ruleset: la primera coincidencia gana, de más
// específico a más genérico.
const RULESETS = {
    // Veterinaria, grooming, guardería — el giro original de Taylor's.
    pets: [
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
        ...SHARED_RULES,
    ],
    // Salones de uñas y pestañas.
    "unas-pestanas": [
        [/pesta/i,                              PiMagicWandBold],
        [/(u[ñn]a|manicur|pedicur|acr[ií]lico|gel)/i, PiPaintBrushBold],
        [/(depilaci[oó]n|cera|l[aá]ser)/i,      PiSunBold],
        [/(masaje|relaj|spa)/i,                 PiFlowerLotusBold],
        [/(facial|piel|limpieza facial)/i,      PiDropBold],
        [/(cej|dise[ñn]o de cej)/i,             PiMagicWandBold],
        ...SHARED_RULES,
    ],
    // Spa / bienestar / masajes.
    spa: [
        [/(masaje|relaj|spa|bienestar)/i,       PiFlowerLotusBold],
        [/(facial|piel|limpieza facial)/i,      PiDropBold],
        [/(depilaci[oó]n|cera|l[aá]ser)/i,      PiSunBold],
        [/(aromaterapia|esencia)/i,             PiSparkleBold],
        ...SHARED_RULES,
    ],
    // Barbería / peluquería.
    barberia: [
        [/(corte|peluquer|tijera)/i,            PiScissorsBold],
        [/(barba|afeitad|rasurad)/i,            PiScissorsBold],
        [/ba(ñ|n)o/i,                           PiBathtubBold],
        ...SHARED_RULES,
    ],
    // Clínica dental / consultorio médico.
    clinica: [
        [/(consulta|m[eé]dic|dental|dentist|odont)/i, PiStethoscopeBold],
        [/(limpieza|higien)/i,                  PiDropBold],
        [/(farmaci|medicin|pastilla)/i,         PiPillBold],
        ...SHARED_RULES,
    ],
    // Gimnasio / estudios de clases (yoga, pilates, baile).
    gimnasio: [
        [/(clase|entrenamiento|rutina)/i,       PiTrophyBold],
        [/(yoga|pilates|estiramiento)/i,        PiFlowerLotusBold],
        [/(nutrici[oó]n|dieta)/i,               PiBoneBold],
        ...SHARED_RULES,
    ],
    // Cafetería / restaurante — cada "servicio" aquí suele ser un platillo,
    // bebida, o (si el negocio reserva mesa) el tipo de mesa.
    alimentos: [
        [/(mesa|reservaci[oó]n)/i,               PiTableBold],
        [/(caf[eé]|espresso|latte|capuchino)/i, PiCoffeeBold],
        [/(cerveza|vino|bebida alcoh[oó]lica)/i, PiWineBold],
        [/(hamburgu|sandwich|sándwich|torta)/i, PiHamburgerBold],
        [/(pizza)/i,                              PiPizzaBold],
        [/(postre|pastel|dulce)/i,               PiCakeBold],
        [/(plato|comida|men[uú]|almuerzo|desayuno|cena)/i, PiBowlFoodBold],
        ...SHARED_RULES,
    ],
};

// Devuelve un componente de ícono (no un elemento) — el caller lo renderiza
// como <Icon /> para poder pasarle tamaño/color por props.
export const getServiceIcon = (text, rulesetKey = 'pets') => {
    const str = String(text || '');
    const rules = RULESETS[rulesetKey] || RULESETS.pets;
    for (const [pattern, Icon] of rules) {
        if (pattern.test(str)) return Icon;
    }
    return PiSparkleBold; // fallback genérico pero con carácter, no una huella repetida de más
};

// Ícono de respaldo explícito para "paseo/mascota" en vez de PiSparkleBold,
// usado cuando el contexto es claramente sobre la mascota en sí.
export const PawIcon = PiPawPrintBold;
