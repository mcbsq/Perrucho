-- Agrega el valor 'superadmin' al enum Role — cuenta única y maestra, por
-- encima de cualquier negocio (User.businessId = NULL para esta fila).
ALTER TYPE "Role" ADD VALUE 'superadmin';
