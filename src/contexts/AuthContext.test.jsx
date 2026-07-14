// src/contexts/AuthContext.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth, setDataReloader } from './AuthContext';
import { authApi } from '../api/apiClient';

jest.mock('../api/apiClient', () => ({
    authApi: {
        login: jest.fn(),
        signup: jest.fn(),
        me: jest.fn(),
    },
    petsApi: {},
}));

// Componente de prueba que expone el estado/acciones de AuthContext
function Probe() {
    const { user, isLoggedIn, login, register, logout } = useAuth();
    const [error, setError] = React.useState('');

    const doLogin = async () => {
        setError('');
        try {
            await login('ana@example.com', 'secreta123');
        } catch (err) {
            setError(err.message);
        }
    };

    const doRegister = async () => {
        setError('');
        try {
            await register({ name: 'Ana', email: 'ana@example.com', phone: '2281234567', password: 'secreta123' });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <div data-testid="logged-in">{String(isLoggedIn)}</div>
            <div data-testid="user-name">{user?.name || ''}</div>
            <div data-testid="error">{error}</div>
            <button onClick={doLogin}>login</button>
            <button onClick={doRegister}>register</button>
            <button onClick={logout}>logout</button>
        </div>
    );
}

const renderWithProvider = () =>
    render(
        <AuthProvider>
            <Probe />
        </AuthProvider>
    );

describe('AuthContext', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        setDataReloader(null);
    });

    test('login exitoso guarda token+sesión y actualiza el usuario', async () => {
        authApi.login.mockResolvedValue({
            token: 'tok123',
            user: { id: 'u1', name: 'Ana', role: 'cliente' },
        });

        renderWithProvider();
        fireEvent.click(screen.getByText('login'));

        await waitFor(() => {
            expect(screen.getByTestId('logged-in')).toHaveTextContent('true');
        });
        expect(screen.getByTestId('user-name')).toHaveTextContent('Ana');
        expect(localStorage.getItem('perrucho_token')).toBe('tok123');
        expect(JSON.parse(localStorage.getItem('perrucho_session'))).toEqual({
            id: 'u1', name: 'Ana', role: 'cliente',
        });
    });

    test('login exitoso dispara _reloadClientsAndPets (bug fix: listas ya no quedan vacías tras login)', async () => {
        authApi.login.mockResolvedValue({
            token: 'tok123',
            user: { id: 'u1', name: 'Ana', role: 'administrador' },
        });
        const reloadFn = jest.fn().mockResolvedValue();
        setDataReloader(reloadFn);

        renderWithProvider();
        fireEvent.click(screen.getByText('login'));

        await waitFor(() => {
            expect(reloadFn).toHaveBeenCalledTimes(1);
        });
    });

    test('login fallido con 401 lanza un mensaje de error legible', async () => {
        const err = new Error('Unauthorized');
        err.status = 401;
        authApi.login.mockRejectedValue(err);

        renderWithProvider();
        fireEvent.click(screen.getByText('login'));

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Correo o contraseña incorrectos.');
        });
        expect(screen.getByTestId('logged-in')).toHaveTextContent('false');
        expect(localStorage.getItem('perrucho_token')).toBeNull();
    });

    test('login fallido por error de red lanza mensaje genérico', async () => {
        const err = new Error('Network error');
        authApi.login.mockRejectedValue(err);

        renderWithProvider();
        fireEvent.click(screen.getByText('login'));

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('No se pudo conectar con el servidor.');
        });
    });

    test('register exitoso guarda sesión y token', async () => {
        authApi.signup.mockResolvedValue({
            token: 'tokReg',
            user: { id: 'u2', name: 'Ana', role: 'cliente' },
        });

        renderWithProvider();
        fireEvent.click(screen.getByText('register'));

        await waitFor(() => {
            expect(screen.getByTestId('logged-in')).toHaveTextContent('true');
        });
        expect(localStorage.getItem('perrucho_token')).toBe('tokReg');
        expect(authApi.signup).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Ana',
            email: 'ana@example.com',
        }));
    });

    test('register fallido con 409 informa cuenta duplicada', async () => {
        const err = new Error('Conflict');
        err.status = 409;
        authApi.signup.mockRejectedValue(err);

        renderWithProvider();
        fireEvent.click(screen.getByText('register'));

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Ya existe una cuenta con ese correo.');
        });
    });

    test('logout limpia el usuario y localStorage', async () => {
        authApi.login.mockResolvedValue({
            token: 'tok123',
            user: { id: 'u1', name: 'Ana', role: 'cliente' },
        });

        renderWithProvider();
        fireEvent.click(screen.getByText('login'));
        await waitFor(() => expect(screen.getByTestId('logged-in')).toHaveTextContent('true'));

        fireEvent.click(screen.getByText('logout'));

        expect(screen.getByTestId('logged-in')).toHaveTextContent('false');
        expect(localStorage.getItem('perrucho_token')).toBeNull();
        expect(localStorage.getItem('perrucho_session')).toBeNull();
    });
});
