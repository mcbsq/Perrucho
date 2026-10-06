// src/utils/petOwners.js
//
// Una mascota puede tener varios dueños (Pet.ownerIds, ver PetOwner en
// prisma/schema.prisma) — el primero es el principal (Pet.ownerId). Las
// respuestas viejas del API solo traen ownerId; estos helpers aceptan ambas
// formas para que ninguna pantalla tenga que acordarse de la diferencia.

export const getPetOwnerIds = (pet) => {
    if (!pet) return [];
    const ids = Array.isArray(pet.ownerIds) && pet.ownerIds.length
        ? pet.ownerIds
        : (pet.ownerId != null && pet.ownerId !== '' ? [pet.ownerId] : []);
    return ids.map(String);
};

export const isPetOwnedBy = (pet, clientId) =>
    getPetOwnerIds(pet).includes(String(clientId));

export const getPetsOfClient = (pets, clientId) =>
    (pets || []).filter(p => isPetOwnedBy(p, clientId));

// Dueños en el orden de la mascota (principal primero). Si un id ya no
// existe en `clients` (ej. cliente recién borrado) simplemente se omite.
export const getOwnersOfPet = (pet, clients) => {
    const byId = new Map((clients || []).map(c => [String(c.id), c]));
    return getPetOwnerIds(pet).map(id => byId.get(id)).filter(Boolean);
};

export const getPrimaryOwner = (pet, clients) => getOwnersOfPet(pet, clients)[0] || null;
