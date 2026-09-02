import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PosServicePricePicker from './PosServicePricePicker';

const service = {
    id: 1,
    title: 'Baño',
    pricingMode: 'weight',
    priceMini: 100, priceChico: 150, priceMediano: 200,
    priceGrande: 250, priceExtra: 300, priceJumbo: 400,
};

test('elige una mascota registrada y entrega su talla y precio al POS', () => {
    const onPick = jest.fn();
    const pet = { id: 18, petName: 'Luna', ownerId: 4, weight: '8', status: 'activo' };

    render(<PosServicePricePicker service={service} pets={[pet]} clients={[{ id: 4, name: 'Ana' }]} showPets onPick={onPick} />);

    fireEvent.click(screen.getByRole('button', { name: /Luna.*Chico.*\$150/i }));

    expect(onPick).toHaveBeenCalledWith(
        { key: 'chico', label: 'Chico', desc: '6-9 kg', price: 150 },
        pet,
    );
});
