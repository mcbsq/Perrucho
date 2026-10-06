import { getPetOwnerIds, getPetsOfClient, getOwnersOfPet, isPetOwnedBy } from './petOwners';

const clients = [{ id: 1, name: 'Ana' }, { id: 2, name: 'Beto' }, { id: 3, name: 'Caro' }];
const pets = [
    { id: 10, petName: 'Firulais', ownerId: 1, ownerIds: [1, 2] },
    { id: 11, petName: 'Luna', ownerId: 2 }, // respuesta vieja del API, sin ownerIds
    { id: 12, petName: 'Max', ownerId: 3, ownerIds: [3] },
];

describe('petOwners', () => {
    test('usa ownerIds cuando viene, y cae a ownerId si no', () => {
        expect(getPetOwnerIds(pets[0])).toEqual(['1', '2']);
        expect(getPetOwnerIds(pets[1])).toEqual(['2']);
        expect(getPetOwnerIds({})).toEqual([]);
    });

    test('una mascota compartida aparece en cada uno de sus dueños', () => {
        expect(getPetsOfClient(pets, 1).map(p => p.petName)).toEqual(['Firulais']);
        expect(getPetsOfClient(pets, 2).map(p => p.petName)).toEqual(['Firulais', 'Luna']);
        expect(isPetOwnedBy(pets[0], '2')).toBe(true);
    });

    test('dueños en orden, principal primero, omitiendo ids que ya no existen', () => {
        expect(getOwnersOfPet(pets[0], clients).map(c => c.name)).toEqual(['Ana', 'Beto']);
        expect(getOwnersOfPet({ ownerIds: [99, 3] }, clients).map(c => c.name)).toEqual(['Caro']);
    });
});
