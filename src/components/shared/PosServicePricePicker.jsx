import React from 'react';
import { FaPaw } from 'react-icons/fa';
import { getPosServicePriceOptions, getWeightRange } from '../../utils/pricingRules';

// Selector reutilizado por el POS de administrador y empleado. La venta de un
// servicio no debe usar el precio base a ciegas: el staff elige una talla, o
// una mascota registrada y el sistema toma su talla automáticamente.
const PosServicePricePicker = ({ service, pets = [], clients = [], showPets = false, onPick }) => {
    const options = getPosServicePriceOptions(service);
    const isWeightPricing = service?.pricingMode !== 'custom';
    const activePets = showPets ? pets.filter(pet => pet.status !== 'inactivo') : [];

    return (
        <div className="pos-service-picker">
            {isWeightPricing && activePets.length > 0 && (
                <section className="pos-service-picker-section">
                    <div className="pos-service-picker-heading">
                        <strong>Elegir mascota</strong>
                        <span>Calcula el precio con su peso registrado.</span>
                    </div>
                    <div className="pos-pet-price-grid">
                        {activePets.map(pet => {
                            const range = getWeightRange(pet.weight);
                            const option = options.find(item => item.key === range.key);
                            const owner = clients.find(client => String(client.id) === String(pet.ownerId));
                            return (
                                <button key={pet.id} type="button" className="pos-pet-price-option"
                                    onClick={() => onPick(option, pet)}>
                                    <span className="pos-pet-price-icon"><FaPaw /></span>
                                    <span className="pos-pet-price-copy">
                                        <strong>{pet.petName}</strong>
                                        <small>{owner?.name || 'Cliente'} · {range.label} ({range.desc})</small>
                                    </span>
                                    <strong className="pos-pet-price-value">${option?.price ?? 0}</strong>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="pos-service-picker-section">
                <div className="pos-service-picker-heading">
                    <strong>{isWeightPricing ? 'O elegir talla manualmente' : 'Elegir tipo de servicio'}</strong>
                    <span>{isWeightPricing ? 'Útil si la mascota aún no está registrada.' : 'Usa las opciones configuradas para este servicio.'}</span>
                </div>
                <div className="ds-price-table">
                    {options.map(option => (
                        <button key={option.key} type="button" className="ds-step-row pos-service-price-option"
                            onClick={() => onPick(option, null)}>
                            <span className="pos-service-price-copy">
                                <strong>{option.label}</strong>
                                {option.desc && <small>{option.desc}</small>}
                            </span>
                            <strong className="pos-service-price-value">${option.price}</strong>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default PosServicePricePicker;
