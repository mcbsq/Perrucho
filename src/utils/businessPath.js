// src/utils/businessPath.js
//
// Construye rutas públicas de negocio (/:giro/:slug/...). Antes solo era
// /:slug — se agregó el giro adelante a pedido del cliente (URL más
// descriptiva, ej. emporio.app/uñas/mi-salon). Centralizado acá porque
// media docena de componentes derivaban el slug del primer segmento de la
// URL por separado (Navbar, Footer, Login, Register, Shop, Services, Home,
// SobreNosotros...) — con el giro de por medio, cada uno tendría que saber
// que ahora son DOS segmentos reservados, no uno; un solo lugar evita que
// alguno se quede desactualizado.
import { useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { getGiroUrlLabel } from '../config/giroPresets';

// Rutas que no viven bajo /:giro/:slug/... — ahí no hay giro/slug en la URL,
// se derivan de /api/settings (que ya trae giro y slug del negocio actual)
// en su lugar.
const RESERVED_SEGMENTS = ['perfil', 'admin-dashboard', 'employee-dashboard', 'superadmin'];

export const useBusinessPath = () => {
    const location = useLocation();
    const { settings } = useData();
    // decodeURIComponent: location.pathname llega codificado (ej. "uñas" es
    // "u%C3%B1as") — sin esto, `giro` quedaba con el segmento crudo y
    // React Router lo volvía a codificar al construir un <Link to>,
    // produciendo URLs doblemente codificadas.
    const segments = decodeURIComponent(location.pathname).split('/').filter(Boolean);
    const firstSegment = segments[0] || '';
    const isReserved = RESERVED_SEGMENTS.includes(firstSegment);

    const giro = isReserved ? getGiroUrlLabel(settings?.giro) : firstSegment;
    const slug = isReserved ? (settings?.slug || '') : (segments[1] || '');
    const base = `/${giro}/${slug}`;

    return { giro, slug, base, withBusinessPath: (path = '') => `${base}${path}` };
};
