# Herramientas específicas por giro de negocio

**Fecha:** 2026-08-21
**Estado:** Aprobado para plan de implementación

## Contexto

Hoy los 7 giros soportados (`src/config/giroPresets.js`) comparten exactamente
el mismo motor: citas con horario/duración, catálogo de servicios, POS,
inventario, clientes. Lo único que varía por giro es copy, modo de precio
(`weight` vs `custom`), set de íconos y campos extra de registro. Comparado
con apps líderes del mercado por categoría (Booksy/Fresha para
uñas-pestañas-spa-barbería-mascotas, Mindbody/Glofox para gimnasios,
Doctoralia/SimplePractice para clínicas, Toast/Square para comida), faltan
piezas que esas apps consideran su valor central para cada categoría. Este
documento especifica qué se agrega, por qué, y cómo encaja en el motor
compartido sin bifurcar la lógica de negocio por giro.

## Principio de diseño

Extender el patrón que ya existe (`Settings.enablePets`,
`Service.pricingMode`, `Settings.businessHours`): cada capacidad nueva es
genérica, vive en el motor compartido, y se prende/apaga por negocio con un
flag en `Settings`, con un valor por defecto que trae el preset de su giro
(`giroPresets.js`) y que el admin puede cambiar después desde
Personalización → "Giro de negocio" (sección que ya existe hoy con el
toggle `enablePets`).

Se evita a propósito: tablas de historial paralelas cuando un campo JSON en
la fila ya alcanza (mismo patrón que `Pet.history`), y relaciones nuevas
cuando un campo nullable directo en `User` alcanza (mismo patrón que
`User.capacity`). Ningún giro obtiene una tabla, un endpoint o un componente
que otro giro no pueda —en teoría— también usar si prende su flag.

---

## 1. Elegir a quién te atiende

**Giros:** mascotas, uñas, pestañas, spa, barbería, clínica, gimnasio (clases).
**No aplica a:** alimentos (una mesa no tiene "quién te atiende").

### Problema
El cliente reserva un día; el negocio asigna el empleado después
(`AssignTimePicker`, o el campo "¿Quién atiende?" del formulario manual del
admin). Las apps de la categoría (Booksy, Fresha) dejan elegir estilista al
reservar — es lo que un cliente recurrente espera poder hacer.

### Diseño
- Nuevo flag `Settings.enableStaffSelection` (Boolean, default según
  preset — `true` en todos los giros de cita, `false` en alimentos).
- `Appointment.employeeId` ya existe — no se agrega columna. Lo que cambia
  es CUÁNDO se llena: si el cliente elige un empleado al reservar, la cita
  se crea directo con ese `employeeId` en vez de null.
- `GET /api/appointments/availability` gana un parámetro opcional
  `employeeId`. Cuando viene, `getFullSlotsForDate` dejar de sumar
  capacidad agregada de todos los empleados y en su lugar cuenta solo las
  citas YA asignadas a ese empleado en esa ventana de tiempo — si ese
  empleado ya tiene algo a esa hora, el slot sale lleno para él aunque otro
  empleado esté libre.
- UI: `Home.jsx` (booking express) y `ServiceModal.jsx` (reserva con
  cuenta) ganan un selector "¿Quién te gustaría que te atienda?" con
  opciones = empleados activos del negocio + "Sin preferencia" (default).
  Si el negocio solo tiene un empleado, el selector no se muestra (no tiene
  caso elegir entre uno).
- `AssignTimePicker` (para citas que llegaron con `employeeId: null`, ej.
  booking express con "sin preferencia") sigue funcionando exactamente
  igual que hoy — nada cambia ahí.

---

## 2. Gimnasio: membresías reales

### Problema
El sistema hoy solo agenda "una cita" — no hay noción de mensualidad,
vigencia, ni de que una clase requiere una membresía activa. Es el corazón
del modelo de negocio de Mindbody/Glofox y hoy no existe en absoluto.

### Diseño
- Nuevo modelo `MembershipPlan` (catálogo — lo administra el admin, mismo
  patrón que `Service`):
  ```prisma
  model MembershipPlan {
    id            Int     @id @default(autoincrement())
    name          String  // "Mensualidad Ilimitada"
    price         Int
    durationDays  Int     @default(30)
    classesLimit  Int?    // null = ilimitado
    businessId    Int?
    business      Business? @relation(fields: [businessId], references: [id])
    members       User[]    @relation("MembershipPlanUsers")
  }
  ```
- `User` gana 3 campos nullable (mismo patrón que `capacity`):
  `membershipPlanId Int?`, `membershipExpiresAt DateTime?`,
  `membershipClassesUsed Int?`. Sin tabla de historial de renovaciones —
  igual que el resto del sistema, MVP sin over-engineering; una renovación
  simplemente mueve `membershipExpiresAt` hacia adelante.
- Admin: nueva pestaña "Membresías" (visible solo si
  `Settings.enableMemberships`) — CRUD de `MembershipPlan`, y desde la
  ficha de un cliente: asignar plan / renovar (extiende
  `membershipExpiresAt` según `durationDays` del plan) / cancelar.
- Al confirmar una cita cuyo servicio está marcado como clase (ver abajo),
  `ApptDetailPopup` muestra un badge "Membresía vigente hasta X" o
  "⚠️ Sin membresía activa" — no bloquea la confirmación (el negocio decide
  si deja pasar), solo informa, igual que el resto de badges de estado que
  ya existen.
- `Service` gana un boolean `isClass` (default false) para que el admin
  marque qué servicios son "clases" sujetas a membresía vs. servicios
  sueltos que un gimnasio también puede vender (ej. una valoración inicial
  de pago único).
- Cliente: en Ajustes (Perfil), nueva sección "Mi membresía" — plan,
  vigencia, clases usadas si el plan las limita.

---

## 3. Clínica: expediente real

### Problema
Los campos extra de registro (`clientExtraFields`) son datos fijos del
cliente, no notas por consulta. Doctoralia/SimplePractice acumulan un
historial de notas por visita — es lo que un consultorio espera poder
consultar en la siguiente cita.

### Diseño
- `User` gana `clinicalHistory Json @default("[]")` — mismo patrón exacto
  que `Pet.history` (que ya existe y ya se usa igual para mascotas), ahora
  aplicado a personas. Cada entrada: `{ date, appointmentId, authorName,
  note }`.
- Se activa con `Settings.enableClientNotes` (default `true` en clínica,
  `false` en el resto).
- En el flujo de "Finalizar y cobrar" (`ApptDetailPopup`, ya existe), si el
  flag está prendido aparece un textarea opcional "Nota clínica de esta
  consulta" — al guardar, se agrega (push) al `clinicalHistory` del
  cliente, no lo reemplaza.
- Cliente: en Ajustes, nueva sección "Mi expediente" — lista de solo
  lectura de sus notas, más reciente primero. Mismo componente visual que
  ya se usa para mostrar el historial de una mascota en Perfil, reutilizado
  para esto.

---

## 4. Giro nuevo: Alimentos y bebidas

### Problema
Ningún giro actual cubre un negocio de comida — ni cafetería de mostrador
ni restaurante con mesas.

### Diseño
Nueva entrada en `GIRO_PRESETS`:
```js
alimentos: {
    label: 'Cafetería / Restaurante',
    urlLabel: 'comida',
    enablePets: false,
    pricingModeDefault: 'custom',
    iconRuleset: 'alimentos',
    enableTableReservationsDefault: false, // cafetería de mostrador por default
    copy: {
        heroTagline: 'Menú · Pedidos · Mesas',
        heroSubtitle: 'De la barra a la mesa, todo en un panel. Agenda tu mesa en minutos.',
        whyUsTitle: '¿Por qué elegirnos?',
        petSectionLabel: null,
    },
    clientExtraFieldsDefault: [
        { key: 'restricciones', label: 'Restricciones alimentarias', required: false },
    ],
},
```

Un solo flag decide el modo: `Settings.enableTableReservations`.

- **Apagado (cafetería/mostrador, el caso más común):** no se muestra
  "Reservar cita" en `Home.jsx` — el CTA principal pasa a ser "Ver menú" y
  lleva directo a la sección de Servicios. El catálogo de `Service` SE
  REUTILIZA como menú: cada servicio es un platillo/bebida, y
  `customPriceOptions` (ya existe, hoy sirve para "tipo de trabajo" en
  uñas) sirve igual de bien para tamaños ("Chico $35 / Grande $45"). El
  flujo real de venta es 100% POS + Inventario (insumos), que ya está
  construido y no cambia nada. La Agenda del admin/empleado sigue
  existiendo pero no se usa en este modo — no hace falta ocultarla, solo no
  tiene citas que mostrar.
- **Encendido (con reservación de mesas):** se reactiva el flujo de citas
  público normal — cada "servicio" pasa a representar una mesa ("Mesa para
  2", con `durationMinutes` = tiempo de reserva). Reutiliza el motor de
  horarios (`businessHours`, `getFullSlotsForDate`) sin ningún cambio —
  para el sistema, reservar una mesa es indistinguible de reservar un
  corte de pelo.
- Nuevo ruleset de íconos `alimentos` en `serviceIcons.jsx` (taza, plato,
  bebida, etc.) siguiendo el mismo patrón por palabras clave que los demás
  rulesets.
- Entrada nueva en `GIRO_MARKETING` para la landing pública `/comida`.

---

## Resumen — matriz final por giro

| Giro | Elegir staff | Membresías | Expediente | Mesas | Precio |
|---|---|---|---|---|---|
| Mascotas | ✅ | — | (ya tiene historial de mascota) | — | por peso |
| Uñas | ✅ | — | — | — | personalizado |
| Pestañas | ✅ | — | — | — | personalizado |
| Spa | ✅ | — | — | — | personalizado |
| Barbería | ✅ | — | — | — | personalizado |
| Clínica | ✅ | — | ✅ | — | personalizado |
| Gimnasio | ✅ (instructor) | ✅ | — | — | personalizado |
| **Alimentos (nuevo)** | — | — | — | configurable | personalizado (menú) |

## Cambios de schema (resumen)

- `Settings`: + `enableStaffSelection`, `enableMemberships`,
  `enableClientNotes`, `enableTableReservations` (todos `Boolean`, con
  default calculado del preset al registrar, editable después).
- `Service`: + `isClass Boolean @default(false)`.
- `User`: + `clinicalHistory Json @default("[]")`, +
  `membershipPlanId Int?`, + `membershipExpiresAt DateTime?`, +
  `membershipClassesUsed Int?`.
- Modelo nuevo: `MembershipPlan`.
- Sin cambios a `Appointment` (reutiliza `employeeId` existente).

## Fuera de alcance (explícitamente, por YAGNI)

- Cobro en línea / anticipos para reservar (no hay pasarela de pago en el
  sistema hoy; todo pago sigue siendo manual como ya es).
- Historial de renovaciones de membresía (solo se guarda la vigencia
  actual, no un log de cada renovación pasada).
- Recordatorios automáticos por WhatsApp/email (seguiría siendo manual,
  como hoy).
- Paquetes/promociones combinadas o puntos de lealtad.
- Gestión de piso/mesas físicas (mapa del restaurante) — "mesa" es solo un
  tipo de servicio reservable, no una entidad con ubicación.

## Plan de rollout

Estas 4 piezas son independientes entre sí (tocan modelos y pantallas
distintas) — se implementan y commitean por separado, en este orden
sugerido: (1) giro de alimentos, por ser el más autocontenido y no requerir
schema nuevo salvo el flag; (2) elegir staff, por ser transversal a más
giros; (3) membresías; (4) expediente clínico. Cada una se verifica con
build + prueba en vivo contra un negocio de prueba (no Taylor's), como el
resto del trabajo de esta sesión.
