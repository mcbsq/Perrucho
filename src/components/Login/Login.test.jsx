// src/components/Login/Login.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: jest.fn(),
}));

// Los assets multimedia (video/imagen) no son necesarios para el test —
// jest con react-scripts los resuelve vía el file transform por defecto,
// así que no hace falta mockearlos explícitamente.

const renderLogin = () =>
    render(
        <MemoryRouter>
            <Login />
        </MemoryRouter>
    );

describe('Login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('el envío del formulario llama a login con los valores capturados', async () => {
        const login = jest.fn().mockResolvedValue({ id: 'u1', role: 'cliente' });
        useAuth.mockReturnValue({ login });

        renderLogin();

        fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'secreta123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

        await waitFor(() => {
            expect(login).toHaveBeenCalledWith('ana@example.com', 'secreta123');
        });
    });

    test('muestra un mensaje de error si el login falla', async () => {
        const login = jest.fn().mockRejectedValue(new Error('Correo o contraseña incorrectos.'));
        useAuth.mockReturnValue({ login });

        renderLogin();

        fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'mala-clave' },
        });

        fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

        await waitFor(() => {
            expect(screen.getByText('Error al conectar con el servidor.')).toBeInTheDocument();
        });
    });

    test('deshabilita el botón mientras se procesa el login', async () => {
        let resolveLogin;
        const login = jest.fn(() => new Promise(resolve => { resolveLogin = resolve; }));
        useAuth.mockReturnValue({ login });

        renderLogin();

        fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'secreta123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

        expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();

        resolveLogin({ id: 'u1', role: 'cliente' });
        await waitFor(() => {
            expect(screen.queryByText('Entrando...')).not.toBeInTheDocument();
        });
    });
});
