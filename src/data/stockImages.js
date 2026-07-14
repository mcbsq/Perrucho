// src/data/stockImages.js
// Biblioteca genérica de imágenes de stock (Unsplash) para que negocios de
// distintos giros puedan personalizar el sitio sin tener que subir sus
// propias fotos. Se sirven directo desde el CDN de Unsplash (no se
// descargan ni se guardan en la base de datos — solo la URL).
//
// Crédito: fotos de Unsplash (https://unsplash.com), uso libre bajo la
// Licencia Unsplash.

const u = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const STOCK_IMAGE_CATEGORIES = [
    {
        key: 'mascotas',
        label: '🐾 Mascotas / Grooming',
        images: [
            u('1543466835-00a7907e9de1'),
            u('1583511655857-d19b40a7a54e'),
            u('1548199973-03cce0bbc87b'),
            u('1601758228041-f3b2795255f1'),
            u('1552053831-71594a27632d'),
            u('1533738363-b7f9aef128ce'),
            u('1514888286974-6c03e2ca1dba'),
        ],
    },
    {
        key: 'estetica',
        label: '💇 Estética / Salón de belleza',
        images: [
            u('1560066984-138dadb4c035'),
            u('1596462502278-27bfdc403348'),
            u('1512290923902-8a9f81dc236c'),
        ],
    },
    {
        key: 'barberia',
        label: '💈 Barbería',
        images: [
            u('1503951914875-452162b0f3f1'),
            u('1585747860715-2ba37e788b70'),
            u('1599351431202-1e0f0137899a'),
        ],
    },
    {
        key: 'unas',
        label: '💅 Salón de uñas',
        images: [
            u('1604654894610-df63bc536371'),
            u('1519014816548-bf5fe059798b'),
            u('1607779097040-26e80aa78e66'),
            u('1522337660859-02fbefca4702'),
        ],
    },
    {
        key: 'spa',
        label: '🧖 Spa',
        images: [
            u('1544161515-4ab6ce6db874'),
            u('1540555700478-4be289fbecef'),
        ],
    },
    {
        key: 'veterinaria',
        label: '🩺 Veterinaria',
        images: [
            u('1628009368231-7bb7cfcb0def'),
            u('1576201836106-db1758fd1c97'),
            u('1584464491033-06628f3a6b7b'),
        ],
    },
    {
        key: 'podologia',
        label: '🦶 Podología',
        images: [
            u('1519415510236-718bdfcd89c8'),
            u('1519824145371-296894a0daa9'),
        ],
    },
    {
        key: 'optica',
        label: '👓 Óptica',
        images: [
            u('1574258495973-f010dfbb5371'),
            u('1508296695146-257a814070b4'),
            u('1577803645773-f96470509666'),
        ],
    },
    {
        key: 'dental',
        label: '🦷 Dental',
        images: [
            u('1606811841689-23dfddce3e95'),
            u('1588776814546-1ffcf47267a5'),
        ],
    },
    {
        key: 'tienda',
        label: '🛍️ Tienda / Productos',
        images: [
            u('1441986300917-64674bd600d8'),
            u('1556740738-b6a63e27c4df'),
            u('1555529669-e69e7aa0ba9a'),
        ],
    },
];

export const ALL_STOCK_IMAGES = STOCK_IMAGE_CATEGORIES.flatMap(c => c.images);
