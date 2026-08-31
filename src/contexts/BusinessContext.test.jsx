import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BusinessProvider, useBusiness } from './BusinessContext';
import { businessApi } from '../api/apiClient';

jest.mock('../api/apiClient', () => ({
    businessApi: { getBySlug: jest.fn() },
    setActiveBusinessSlug: jest.fn(),
}));

const Probe = () => {
    const { loading, notFound, error } = useBusiness();
    return <div>{JSON.stringify({ loading, notFound, error })}</div>;
};

describe('BusinessContext', () => {
    beforeEach(() => jest.clearAllMocks());

    test('no presenta un error de API como negocio inexistente', async () => {
        const apiError = new Error('Error de conexión con el servicio');
        apiError.status = 500;
        businessApi.getBySlug.mockRejectedValue(apiError);

        render(<BusinessProvider slug="emporio-unas"><Probe /></BusinessProvider>);

        await waitFor(() => expect(screen.getByText(/"loading":false/)).toBeInTheDocument());
        expect(screen.getByText(/"notFound":false/)).toBeInTheDocument();
        expect(screen.getByText(/Error de conexión con el servicio/)).toBeInTheDocument();
    });
});
