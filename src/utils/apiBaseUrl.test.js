import { resolveApiBaseUrl } from './apiBaseUrl';

describe('resolveApiBaseUrl', () => {
    test('en un despliegue usa la API del mismo dominio aunque exista una URL de producción compilada', () => {
        expect(resolveApiBaseUrl({
            hostname: 'emporio-cibercom-test.vercel.app',
            configuredUrl: 'https://perrucho.vercel.app/api',
        })).toBe('/api');
    });

    test('en desarrollo local conserva la API local configurada', () => {
        expect(resolveApiBaseUrl({
            hostname: 'localhost',
            configuredUrl: 'http://localhost:3001/api',
        })).toBe('http://localhost:3001/api');
    });

    test('en el contenedor usa la API del mismo origen incluso en localhost', () => {
        expect(resolveApiBaseUrl({
            hostname: 'localhost',
            configuredUrl: 'http://localhost:3001/api',
            sameOrigin: true,
        })).toBe('/api');
    });
});
