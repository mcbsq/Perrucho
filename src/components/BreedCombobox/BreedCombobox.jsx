// src/components/BreedCombobox/BreedCombobox.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Combobox de razas con búsqueda en tiempo real.
// Reemplaza el input texto libre de "Raza" en el form de pacientes.
// Sin dependencias externas — solo React state.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import './BreedCombobox.css';

// ── Catálogo base de razas ────────────────────────────────────────────────────
const BREEDS = {
    perro: [
        'Coli (mestizo caliente)',
        'Chihuahua', 'Labrador Retriever', 'Golden Retriever', 'Poodle Toy',
        'Poodle Mediano', 'Poodle Grande', 'Bulldog Francés', 'Bulldog Inglés',
        'Beagle', 'Dachshund', 'Boxer', 'Rottweiler', 'Pastor Alemán',
        'Husky Siberiano', 'Shih Tzu', 'Yorkshire Terrier', 'Maltés',
        'Schnauzer Miniatura', 'Schnauzer Mediano', 'Schnauzer Gigante',
        'Doberman', 'Dálmata', 'Cocker Spaniel', 'Border Collie',
        'Pomerania', 'Bichón Frisé', 'San Bernardo', 'Gran Danés',
        'Pitbull', 'Mestizo / Criollo',
    ],
    gato: [
        'Siamés', 'Persa', 'Maine Coon', 'Ragdoll', 'Bengalí',
        'Angora', 'Abisinio', 'Sphynx', 'Russisch Azul', 'Scottich Fold',
        'British Shorthair', 'Himalayo', 'Birmano', 'Europeo Común',
        'Mestizo / Criollo',
    ],
    ave: [
        'Periquito', 'Cotorro', 'Loro Amazona', 'Guacamaya', 'Cacatúa',
        'Agapornis', 'Canario', 'Diamante de Gould', 'Ninfa / Cockatiel',
    ],
    otro: ['Conejo', 'Hamster', 'Guinea Pig', 'Tortuga', 'Pez', 'Reptil'],
};

const ALL_BREEDS = Object.values(BREEDS).flat();

const BreedCombobox = ({ value, onChange, species }) => {
    const [open,    setOpen]    = useState(false);
    const [query,   setQuery]   = useState(value || '');
    const ref                   = useRef(null);

    // Sincronizar cuando el padre resetea el form
    useEffect(() => { setQuery(value || ''); }, [value]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Lista según especie seleccionada
    const pool = species && BREEDS[species] ? BREEDS[species] : ALL_BREEDS;

    // Filtrar por query
    const filtered = query.trim() === ''
        ? pool
        : pool.filter(b => b.toLowerCase().includes(query.toLowerCase()));

    const showAddOption = query.trim().length > 1 && !pool.some(b => b.toLowerCase() === query.toLowerCase());

    const select = (breed) => {
        setQuery(breed);
        onChange(breed);
        setOpen(false);
    };

    return (
        <div className="breed-combobox" ref={ref}>
            <input
                type="text"
                className="breed-input"
                placeholder="Raza (buscar o escribir nueva)..."
                value={query}
                onFocus={() => setOpen(true)}
                onChange={e => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                    setOpen(true);
                }}
                autoComplete="off"
            />
            {open && (
                <div className="breed-dropdown">
                    {filtered.length === 0 && !showAddOption && (
                        <div className="breed-option breed-option--empty">Sin coincidencias</div>
                    )}
                    {filtered.map(b => (
                        <div
                            key={b}
                            className={`breed-option ${b === value ? 'selected' : ''}`}
                            onMouseDown={() => select(b)}
                        >
                            {b}
                        </div>
                    ))}
                    {showAddOption && (
                        <div
                            className="breed-option breed-option--add"
                            onMouseDown={() => select(query.trim())}
                        >
                            + Agregar "{query.trim()}" como nueva raza
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BreedCombobox;