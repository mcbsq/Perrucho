// En Vercel el frontend y Express se publican bajo el mismo dominio. Usar
// una URL absoluta compilada aquí hace que los previews apunten a producción
// y el navegador bloquee las peticiones por CORS. Solo el entorno local usa
// una API externa para poder ejecutar CRA y Express en puertos distintos.
export const resolveApiBaseUrl = ({ hostname = '', configuredUrl } = {}) => {
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    return isLocal ? (configuredUrl || 'http://localhost:3001/api') : '/api';
};
