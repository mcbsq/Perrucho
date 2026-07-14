// src/components/shared/DashboardShared.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServiceFormModal, ClientFormModal } from './DashboardShared';

describe('ServiceFormModal (admin)', () => {
    test('por defecto pricingMode es "weight" y muestra la tabla de precios por tamaño', () => {
        render(<ServiceFormModal onSave={jest.fn()} onClose={jest.fn()} />);

        expect(screen.getByText('💲 Precios por tamaño')).toBeInTheDocument();
        expect(screen.queryByText('💲 Opciones de precio personalizadas')).not.toBeInTheDocument();
        // Debe listar los 6 rangos de peso
        expect(screen.getByText('Mini')).toBeInTheDocument();
        expect(screen.getByText('Jumbo')).toBeInTheDocument();
    });

    test('cambiar el selector "Criterio de cobro" a "custom" oculta la tabla por tamaño y muestra opciones personalizadas', () => {
        render(<ServiceFormModal onSave={jest.fn()} onClose={jest.fn()} />);

        const select = screen.getByDisplayValue('Por tamaño / peso de mascota');
        fireEvent.change(select, { target: { value: 'custom' } });

        expect(screen.queryByText('💲 Precios por tamaño')).not.toBeInTheDocument();
        expect(screen.getByText('💲 Opciones de precio personalizadas')).toBeInTheDocument();
        expect(screen.getByText('+ Agregar opción')).toBeInTheDocument();
    });

    test('el toggle "Visible en inicio" cambia el texto de ayuda al desmarcarse', () => {
        render(<ServiceFormModal onSave={jest.fn()} onClose={jest.fn()} />);

        expect(screen.getByText('Se muestra en la página principal')).toBeInTheDocument();

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();

        fireEvent.click(checkbox);

        expect(checkbox).not.toBeChecked();
        expect(screen.getByText('Solo visible en Punto de Venta')).toBeInTheDocument();
    });

    test('agregar y quitar una opción de precio personalizado', () => {
        render(<ServiceFormModal onSave={jest.fn()} onClose={jest.fn()} />);

        fireEvent.change(screen.getByDisplayValue('Por tamaño / peso de mascota'), { target: { value: 'custom' } });
        fireEvent.click(screen.getByText('+ Agregar opción'));

        const labelInput = screen.getByPlaceholderText(/Gelish, Acrílico/i);
        expect(labelInput).toBeInTheDocument();

        fireEvent.change(labelInput, { target: { value: 'Corte de caballero' } });
        expect(labelInput.value).toBe('Corte de caballero');
    });

    test('envía el formulario y llama a onSave con los datos capturados', async () => {
        const onSave = jest.fn().mockResolvedValue({});
        render(<ServiceFormModal onSave={onSave} onClose={jest.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('Nombre del servicio'), { target: { value: 'Baño y corte' } });

        // Llenar los 6 precios por tamaño (todos son "required")
        const priceInputs = screen.getAllByPlaceholderText('0');
        priceInputs.forEach((input, i) => {
            fireEvent.change(input, { target: { value: String(100 + i * 10) } });
        });

        fireEvent.submit(screen.getByText('Guardar servicio').closest('form'));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const payload = onSave.mock.calls[0][0];
        expect(payload.title).toBe('Baño y corte');
        expect(payload.priceMini).toBe('100');
    });
});

describe('ClientFormModal (empleado — extraFields configurables por giro de negocio)', () => {
    test('renderiza los campos extra configurados y los guarda en extraData', async () => {
        const extraFields = [
            { key: 'raza_favorita', label: 'Raza favorita', required: true },
            { key: 'alergias', label: 'Alergias conocidas', required: false },
        ];
        const onSave = jest.fn().mockResolvedValue({});
        render(<ClientFormModal onSave={onSave} onClose={jest.fn()} extraFields={extraFields} />);

        expect(screen.getByText('Raza favorita')).toBeInTheDocument();
        expect(screen.getByText('Alergias conocidas')).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Ana Pérez' } });
        fireEvent.change(screen.getByPlaceholderText('55 1234 5678'), { target: { value: '5512345678' } });
        fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'ana@example.com' } });

        // Los inputs de extraFields no tienen placeholder — se ubican por posición
        // dentro del grid (los últimos N inputs de texto, tras nombre/teléfono/correo).
        const allInputs = screen.getAllByRole('textbox');
        // Los últimos 2 inputs de texto corresponden a los extraFields (name, extras...)
        const razaFavoritaInput = allInputs[allInputs.length - 2];
        const alergiasInput = allInputs[allInputs.length - 1];

        fireEvent.change(razaFavoritaInput, { target: { value: 'Labrador' } });
        fireEvent.change(alergiasInput, { target: { value: 'Ninguna' } });

        fireEvent.submit(screen.getByText('Guardar cliente').closest('form'));

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const payload = onSave.mock.calls[0][0];
        expect(payload.name).toBe('Ana Pérez');
        expect(payload.extraData).toEqual({ raza_favorita: 'Labrador', alergias: 'Ninguna' });
    });

    test('sin extraFields no se renderiza ningún campo adicional', () => {
        render(<ClientFormModal onSave={jest.fn()} onClose={jest.fn()} />);
        expect(screen.queryByText('Raza favorita')).not.toBeInTheDocument();
    });
});
