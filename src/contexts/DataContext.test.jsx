// src/contexts/DataContext.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DataProvider, useData } from './DataContext';
import {
    servicesApi, productsApi, settingsApi,
    clientsApi, petsApi, salesApi, appointmentsApi,
} from '../api/apiClient';

jest.mock('../api/apiClient', () => ({
    servicesApi: { getAll: jest.fn(), create: jest.fn() },
    productsApi: { getAll: jest.fn() },
    settingsApi: { get: jest.fn(), update: jest.fn() },
    clientsApi: { getAll: jest.fn(), create: jest.fn() },
    petsApi: { getAll: jest.fn() },
    salesApi: { getAll: jest.fn() },
    appointmentsApi: { getAll: jest.fn() },
}));

function Probe() {
    const { services, products, clients, pets, sales, appointments, settings, loading, addClient, addService } = useData();
    return (
        <div>
            <div data-testid="loading">{String(loading)}</div>
            <div data-testid="services-count">{services.length}</div>
            <div data-testid="products-count">{products.length}</div>
            <div data-testid="clients-count">{clients.length}</div>
            <div data-testid="pets-count">{pets.length}</div>
            <div data-testid="sales-count">{sales.length}</div>
            <div data-testid="appointments-count">{appointments.length}</div>
            <div data-testid="settings">{settings ? JSON.stringify(settings) : ''}</div>
            <button onClick={() => addClient({ name: 'Nuevo cliente' })}>add-client</button>
            <button onClick={() => addService({ title: 'Nuevo servicio' })}>add-service</button>
        </div>
    );
}

const renderWithProvider = () =>
    render(
        <DataProvider>
            <Probe />
        </DataProvider>
    );

const setPublicMocks = () => {
    servicesApi.getAll.mockResolvedValue([{ id: 's1' }]);
    productsApi.getAll.mockResolvedValue([{ id: 'p1' }]);
    settingsApi.get.mockResolvedValue({ theme: 'blue' });
};

describe('DataContext', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        setPublicMocks();
    });

    test('sin token: solo carga datos públicos (services, products, settings)', async () => {
        renderWithProvider();

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        expect(screen.getByTestId('services-count')).toHaveTextContent('1');
        expect(screen.getByTestId('products-count')).toHaveTextContent('1');
        expect(screen.getByTestId('settings')).toHaveTextContent('blue');
        expect(screen.getByTestId('clients-count')).toHaveTextContent('0');
        expect(screen.getByTestId('pets-count')).toHaveTextContent('0');
        expect(screen.getByTestId('sales-count')).toHaveTextContent('0');
        expect(screen.getByTestId('appointments-count')).toHaveTextContent('0');

        expect(clientsApi.getAll).not.toHaveBeenCalled();
        expect(petsApi.getAll).not.toHaveBeenCalled();
        expect(salesApi.getAll).not.toHaveBeenCalled();
        expect(appointmentsApi.getAll).not.toHaveBeenCalled();
    });

    test('con token y rol admin: carga también clients/pets/sales/appointments', async () => {
        localStorage.setItem('perrucho_token', 'tok123');
        localStorage.setItem('perrucho_session', JSON.stringify({ id: 'u1', role: 'administrador' }));
        clientsApi.getAll.mockResolvedValue([{ id: 'c1' }]);
        petsApi.getAll.mockResolvedValue([{ id: 'pet1' }]);
        salesApi.getAll.mockResolvedValue([{ id: 'sale1' }]);
        appointmentsApi.getAll.mockResolvedValue([{ id: 'a1' }]);

        renderWithProvider();

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        expect(screen.getByTestId('clients-count')).toHaveTextContent('1');
        expect(screen.getByTestId('pets-count')).toHaveTextContent('1');
        expect(screen.getByTestId('sales-count')).toHaveTextContent('1');
        expect(screen.getByTestId('appointments-count')).toHaveTextContent('1');
    });

    test('con token y rol empleado: también carga todos los datos privados', async () => {
        localStorage.setItem('perrucho_token', 'tok123');
        localStorage.setItem('perrucho_session', JSON.stringify({ id: 'u2', role: 'empleado' }));
        clientsApi.getAll.mockResolvedValue([{ id: 'c1' }]);
        petsApi.getAll.mockResolvedValue([{ id: 'pet1' }]);
        salesApi.getAll.mockResolvedValue([{ id: 'sale1' }]);
        appointmentsApi.getAll.mockResolvedValue([{ id: 'a1' }]);

        renderWithProvider();

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
        expect(screen.getByTestId('clients-count')).toHaveTextContent('1');
    });

    test('con token y rol cliente: NO carga clients/pets/sales, solo appointments', async () => {
        localStorage.setItem('perrucho_token', 'tok123');
        localStorage.setItem('perrucho_session', JSON.stringify({ id: 'u3', role: 'cliente' }));
        appointmentsApi.getAll.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);

        renderWithProvider();

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        expect(screen.getByTestId('appointments-count')).toHaveTextContent('2');
        expect(clientsApi.getAll).not.toHaveBeenCalled();
        expect(petsApi.getAll).not.toHaveBeenCalled();
        expect(salesApi.getAll).not.toHaveBeenCalled();
    });

    test('addClient actualiza el estado local de forma optimista tras la llamada API', async () => {
        clientsApi.create.mockResolvedValue({ id: 'c-new', name: 'Nuevo cliente' });

        renderWithProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        fireEvent.click(screen.getByText('add-client'));

        await waitFor(() => {
            expect(screen.getByTestId('clients-count')).toHaveTextContent('1');
        });
        expect(clientsApi.create).toHaveBeenCalledWith({ name: 'Nuevo cliente' });
    });

    test('addService actualiza el estado local tras la llamada API', async () => {
        servicesApi.create.mockResolvedValue({ id: 'sv-new', title: 'Nuevo servicio' });

        renderWithProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        fireEvent.click(screen.getByText('add-service'));

        await waitFor(() => {
            // 1 inicial (del mock público) + 1 agregado = 2
            expect(screen.getByTestId('services-count')).toHaveTextContent('2');
        });
    });
});
