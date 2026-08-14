// src/config/giroPresets.js
//
// Banco de plantillas por giro de negocio — se usa UNA vez, al configurar un
// negocio nuevo, para precargar su fila Settings con valores sensatos según
// a qué se dedica (veterinaria, salón de uñas, spa, etc). De ahí en
// adelante Settings es la fuente de verdad y se edita libremente desde
// Personalización — el preset es solo un punto de partida, no algo que se
// siga consultando en cada request.
//
// Objeto plano en vez de modelo de Prisma o enum a propósito: agregar un
// giro nuevo (o darle un campo que ningún otro preset tenía) debe ser solo
// código — cero migración de base de datos.
// urlLabel: segmento que va en la URL pública antes del slug del negocio
// (ej. emporio.app/uñas/mi-salon) — separado de la clave interna (ascii,
// la que se guarda en Business.giro) porque el negocio pidió que la URL
// lleve el nombre del giro escrito normal, con acentos y todo.
export const GIRO_PRESETS = {
    mascotas: {
        label: 'Veterinaria / Grooming',
        urlLabel: 'mascotas',
        enablePets: true,
        pricingModeDefault: 'weight',
        iconRuleset: 'pets',
        copy: {
            heroTagline: 'Grooming · Tienda · Guardería · Paseos',
            heroSubtitle: 'Baño, corte, arreglo de uñas y más. Agenda tu cita en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: 'Historial clínico',
        },
        clientExtraFieldsDefault: [],
    },
    // Antes un solo giro combinado ("unas-pestanas") — se separó en dos
    // negocios independientes a pedido del cliente, cada uno con su propio
    // segmento de URL, aunque comparten el mismo set de íconos de servicio
    // (ver iconRuleset, src/utils/serviceIcons.jsx) porque el vocabulario
    // de servicios se solapa bastante entre ambos.
    unas: {
        label: 'Salón de uñas',
        urlLabel: 'uñas',
        enablePets: false,
        pricingModeDefault: 'custom',
        iconRuleset: 'unas-pestanas',
        copy: {
            heroTagline: 'Manicure · Pedicure · Uñas acrílicas',
            heroSubtitle: 'Manicure, pedicure, uñas acrílicas y más. Agenda tu cita en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: null,
        },
        clientExtraFieldsDefault: [
            { key: 'alergias', label: '¿Alguna alergia a productos?', required: false },
        ],
    },
    pestanas: {
        label: 'Salón de pestañas',
        urlLabel: 'pestañas',
        enablePets: false,
        pricingModeDefault: 'custom',
        iconRuleset: 'unas-pestanas',
        copy: {
            heroTagline: 'Pestañas · Cejas · Lifting',
            heroSubtitle: 'Extensión de pestañas, lifting, diseño de cejas y más. Agenda tu cita en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: null,
        },
        clientExtraFieldsDefault: [
            { key: 'alergias', label: '¿Alguna alergia a productos?', required: false },
        ],
    },
    spa: {
        label: 'Spa / Bienestar',
        urlLabel: 'spa',
        enablePets: false,
        pricingModeDefault: 'custom',
        iconRuleset: 'spa',
        copy: {
            heroTagline: 'Masajes · Faciales · Bienestar',
            heroSubtitle: 'Tu momento de relajación. Agenda tu cita en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: null,
        },
        clientExtraFieldsDefault: [],
    },
    barberia: {
        label: 'Barbería / Peluquería',
        urlLabel: 'barbería',
        enablePets: false,
        pricingModeDefault: 'custom',
        iconRuleset: 'barberia',
        copy: {
            heroTagline: 'Cortes · Barba · Estilo',
            heroSubtitle: 'El corte que buscas, con la calidad que mereces. Agenda tu cita en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: null,
        },
        clientExtraFieldsDefault: [],
    },
    clinica: {
        label: 'Clínica dental / Consultorio',
        urlLabel: 'clínica',
        enablePets: false,
        pricingModeDefault: 'custom',
        iconRuleset: 'clinica',
        copy: {
            heroTagline: 'Consultas · Tratamientos · Seguimiento',
            heroSubtitle: 'Agenda tu consulta en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: null,
        },
        clientExtraFieldsDefault: [
            { key: 'padecimientos', label: 'Padecimientos o alergias relevantes', required: false },
        ],
    },
    gimnasio: {
        label: 'Gimnasio / Clases',
        urlLabel: 'gimnasio',
        enablePets: false,
        pricingModeDefault: 'custom',
        iconRuleset: 'gimnasio',
        copy: {
            heroTagline: 'Clases · Entrenamiento · Nutrición',
            heroSubtitle: 'Reserva tu lugar en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: null,
        },
        clientExtraFieldsDefault: [],
    },
};

export const GIRO_OPTIONS = Object.entries(GIRO_PRESETS).map(([value, p]) => ({ value, label: p.label }));

export const getGiroPreset = (giro) => GIRO_PRESETS[giro] || GIRO_PRESETS.mascotas;

// giro (clave interna, ascii) → urlLabel (lo que se ve en la URL pública)
export const getGiroUrlLabel = (giro) => (GIRO_PRESETS[giro] || GIRO_PRESETS.mascotas).urlLabel;

// urlLabel → giro (clave interna) — para resolver /:giro/:slug al entrar por
// la URL pública. Si no coincide con ninguno, regresa null (no asumas mascotas).
const URL_LABEL_TO_GIRO = Object.fromEntries(
    Object.entries(GIRO_PRESETS).map(([key, p]) => [p.urlLabel, key])
);
export const getGiroFromUrlLabel = (urlLabel) => URL_LABEL_TO_GIRO[urlLabel] || null;
