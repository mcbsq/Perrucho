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
export const GIRO_PRESETS = {
    mascotas: {
        label: 'Veterinaria / Grooming',
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
    'unas-pestanas': {
        label: 'Uñas y pestañas',
        enablePets: false,
        pricingModeDefault: 'custom',
        iconRuleset: 'unas-pestanas',
        copy: {
            heroTagline: 'Uñas · Pestañas · Cejas · Spa de manos',
            heroSubtitle: 'Manicure, pedicure, extensión de pestañas y más. Agenda tu cita en minutos.',
            whyUsTitle: '¿Por qué elegirnos?',
            petSectionLabel: null,
        },
        clientExtraFieldsDefault: [
            { key: 'alergias', label: '¿Alguna alergia a productos?', required: false },
        ],
    },
    spa: {
        label: 'Spa / Bienestar',
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
