// api/config/giroPresets.js
//
// Copia en CommonJS de src/config/giroPresets.js — el backend no puede
// requerir directamente el archivo del frontend porque usa sintaxis de
// módulos ES (`export const`). Solo trae los campos que el servidor
// necesita para precargar Settings al registrar un negocio nuevo; el
// frontend sigue siendo la fuente de verdad para iconRuleset/label/etc.
// Si agregas un giro nuevo, agrégalo en AMBOS archivos.
const GIRO_PRESETS = {
  mascotas: {
    enablePets: true,
    enableStaffSelectionDefault: true,
    enableMembershipsDefault: false,
    enableClientNotesDefault: false,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Grooming · Tienda · Guardería · Paseos',
      heroSubtitle: 'Baño, corte, arreglo de uñas y más. Agenda tu cita en minutos.',
    },
    clientExtraFieldsDefault: [],
  },
  unas: {
    enablePets: false,
    enableStaffSelectionDefault: true,
    enableMembershipsDefault: false,
    enableClientNotesDefault: false,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Manicure · Pedicure · Uñas acrílicas',
      heroSubtitle: 'Manicure, pedicure, uñas acrílicas y más. Agenda tu cita en minutos.',
    },
    clientExtraFieldsDefault: [
      { key: 'alergias', label: '¿Alguna alergia a productos?', required: false },
    ],
  },
  pestanas: {
    enablePets: false,
    enableStaffSelectionDefault: true,
    enableMembershipsDefault: false,
    enableClientNotesDefault: false,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Pestañas · Cejas · Lifting',
      heroSubtitle: 'Extensión de pestañas, lifting, diseño de cejas y más. Agenda tu cita en minutos.',
    },
    clientExtraFieldsDefault: [
      { key: 'alergias', label: '¿Alguna alergia a productos?', required: false },
    ],
  },
  spa: {
    enablePets: false,
    enableStaffSelectionDefault: true,
    enableMembershipsDefault: false,
    enableClientNotesDefault: false,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Masajes · Faciales · Bienestar',
      heroSubtitle: 'Tu momento de relajación. Agenda tu cita en minutos.',
    },
    clientExtraFieldsDefault: [],
  },
  barberia: {
    enablePets: false,
    enableStaffSelectionDefault: true,
    enableMembershipsDefault: false,
    enableClientNotesDefault: false,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Cortes · Barba · Estilo',
      heroSubtitle: 'El corte que buscas, con la calidad que mereces. Agenda tu cita en minutos.',
    },
    clientExtraFieldsDefault: [],
  },
  clinica: {
    enablePets: false,
    enableStaffSelectionDefault: true,
    enableMembershipsDefault: false,
    enableClientNotesDefault: true,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Consultas · Tratamientos · Seguimiento',
      heroSubtitle: 'Agenda tu consulta en minutos.',
    },
    clientExtraFieldsDefault: [
      { key: 'padecimientos', label: 'Padecimientos o alergias relevantes', required: false },
    ],
  },
  gimnasio: {
    enablePets: false,
    enableStaffSelectionDefault: true,
    enableMembershipsDefault: true,
    enableClientNotesDefault: false,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Clases · Entrenamiento · Nutrición',
      heroSubtitle: 'Reserva tu lugar en minutos.',
    },
    clientExtraFieldsDefault: [],
  },
  // Un solo giro para cafetería/restaurante — enableTableReservationsDefault
  // arranca apagado (modo mostrador: el catálogo de Servicios se usa como
  // menú) y el admin lo prende desde Personalización si su negocio sí
  // reserva mesas.
  alimentos: {
    enablePets: false,
    enableStaffSelectionDefault: false,
    enableMembershipsDefault: false,
    enableClientNotesDefault: false,
    enableTableReservationsDefault: false,
    copy: {
      heroTagline: 'Menú · Pedidos · Mesas',
      heroSubtitle: 'De la barra a la mesa, todo en un panel.',
    },
    clientExtraFieldsDefault: [
      { key: 'restricciones', label: 'Restricciones alimentarias', required: false },
    ],
  },
};

const getGiroPreset = (giro) => GIRO_PRESETS[giro] || GIRO_PRESETS.mascotas;

module.exports = { GIRO_PRESETS, getGiroPreset };
