// src/config/giroMarketing.js
//
// Copy de MARKETING por giro, para la landing pública /:giro (ej.
// emporio.app/uñas) — el "gestor de negocios especializado en X" que pidió
// el cliente. Separado a propósito de giroPresets.js: ese archivo define
// los valores con los que se precarga un negocio nuevo (Settings), este
// define cómo se le vende Emporio a alguien de ese giro ANTES de
// registrarse — son dos momentos distintos, mezclarlos habría hecho
// giroPresets.js confuso (¿esta copy es para el negocio o para venderle
// el sistema al dueño?).
export const GIRO_MARKETING = {
    mascotas: {
        headline: 'El sistema para veterinarias y estéticas caninas',
        subtitle: 'Historial clínico, agenda de baño y corte, tienda e inventario — todo en un panel pensado para el cuidado de mascotas.',
        img: 'https://images.unsplash.com/photo-1625277743460-43716b93507a?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Historial clínico', desc: 'Vacunas, tratamientos y notas por mascota, no por cita suelta.' },
            { title: 'Agenda sin choques', desc: 'Baño, corte y consulta con la duración real de cada servicio.' },
            { title: 'Tienda e inventario', desc: 'Vende alimento y accesorios sin hoja de cálculo aparte.' },
        ],
    },
    unas: {
        headline: 'El sistema para salones de uñas',
        subtitle: 'Catálogo de diseños, agenda por manicurista y control de insumos — para que tu salón deje de vivir en el chat de WhatsApp.',
        img: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Catálogo con precio', desc: 'Gel, acrílico, diseños — cada uno con su tiempo y precio real.' },
            { title: 'Agenda por manicurista', desc: 'Cada quien ve solo su día, sin citas encimadas.' },
            { title: 'Control de insumos', desc: 'Sabes cuándo se te va a acabar el gel antes de que pase.' },
        ],
    },
    pestanas: {
        headline: 'El sistema para salones de pestañas',
        subtitle: 'Agenda por técnica, ficha de alergias por clienta y recordatorio de retoque — sin perseguir a nadie por WhatsApp.',
        img: 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Ficha por clienta', desc: 'Alergias, técnica preferida y curvatura, a la mano en cada cita.' },
            { title: 'Recordatorio de retoque', desc: 'Tus clientas vuelven a las 3 semanas sin que tengas que acordarte tú.' },
            { title: 'Agenda por técnica', desc: 'Clásico, volumen ruso, híbrido — cada uno con su duración real.' },
        ],
    },
    spa: {
        headline: 'El sistema para spas y centros de bienestar',
        subtitle: 'Paquetes, membresías y agenda por cabina — para que cada masaje y facial quede registrado, no solo agendado.',
        img: 'https://images.unsplash.com/photo-1620733723572-11c53f73a416?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Paquetes y membresías', desc: 'Vende sesiones por paquete y lleva el conteo automático.' },
            { title: 'Agenda por cabina', desc: 'Sabes qué sala está libre antes de prometer un horario.' },
            { title: 'Historial por cliente', desc: 'Preferencias y tratamientos anteriores, siempre a la mano.' },
        ],
    },
    barberia: {
        headline: 'El sistema para barberías y peluquerías',
        subtitle: 'Agenda por barbero, ficha de estilo por cliente y cobro rápido — para que cada silla esté siempre ocupada.',
        img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Agenda por barbero', desc: 'Cada uno con su propia disponibilidad y sus clientes de siempre.' },
            { title: 'Ficha de estilo', desc: 'El corte y la máquina que usa cada cliente, sin tener que preguntar.' },
            { title: 'Cobro en el momento', desc: 'Punto de venta rápido para servicios y productos de barbería.' },
        ],
    },
    clinica: {
        headline: 'El sistema para clínicas dentales y consultorios',
        subtitle: 'Historial de tratamientos, seguimiento por paciente y recordatorios de cita — sin depender de una libreta.',
        img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Historial de tratamientos', desc: 'Cada consulta queda ligada al paciente, no suelta en el calendario.' },
            { title: 'Seguimiento real', desc: 'Padecimientos y alergias relevantes, visibles antes de la consulta.' },
            { title: 'Recordatorios de cita', desc: 'Menos ausencias, más consultorio ocupado.' },
        ],
    },
    gimnasio: {
        headline: 'El sistema para gimnasios y estudios de clases',
        subtitle: 'Reservas por clase con cupo, membresías y seguimiento de asistencia — todo desde un solo panel.',
        img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Reservas con cupo', desc: 'Cada clase con su límite de lugares, sin sobrecupo.' },
            { title: 'Membresías', desc: 'Sabes quién sigue activo y a quién se le vence el mes.' },
            { title: 'Asistencia', desc: 'Lleva el registro de quién entra a cada clase, sin lista en papel.' },
        ],
    },
    alimentos: {
        headline: 'El sistema para cafeterías y restaurantes',
        subtitle: 'Menú con tamaños y extras, punto de venta e inventario de insumos — y reservación de mesa si tu negocio la necesita.',
        img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=70',
        highlights: [
            { title: 'Menú con variantes', desc: 'Cada platillo o bebida con sus tamaños y precios reales.' },
            { title: 'Cobro rápido', desc: 'Punto de venta pensado para mostrador, no para citas.' },
            { title: 'Mesas opcionales', desc: '¿Tu negocio reserva mesa? Actívalo cuando quieras, sin cambiar de sistema.' },
        ],
    },
};

export const getGiroMarketing = (giro) => GIRO_MARKETING[giro] || GIRO_MARKETING.mascotas;
