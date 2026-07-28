# Auditoría Perrucho — julio 2026

Alcance: `api/index.js`, `middleware/auth.js`, `prisma/schema.prisma`, `src/api/apiClient.js`, `src/contexts/*`, `src/pages/admin`, `src/pages/employee`, `src/pages/cliente`, `src/utils/*`.

Leyenda de prioridad: **Alta** (arreglar antes de seguir creciendo / riesgo de datos o seguridad) · **Media** (deuda técnica con impacto real) · **Baja** (pulido).

---

## 1. Auditoría de código

### 1.1 Seguridad

| # | Hallazgo | Prioridad | Ubicación |
|---|---|---|---|
| 1 | **IDOR confirmado: cualquier cliente autenticado ve las citas de TODOS los demás clientes.** `GET /api/appointments` no filtra por rol — a diferencia de `/api/sales` (línea 761-769 de `api/index.js`, que sí restringe `where.clientId = req.user.id` para rol `cliente`). Además el propio frontend lo dispara así: en `src/contexts/DataContext.jsx` línea 72, el comentario dice *"Cliente: solo carga appointments propias"* pero el código llama `appointmentsApi.getAll()` **sin** `clientId`, trayendo nombre, teléfono, mascota, notas y `guestPhone` de todos los clientes del negocio. | **Alta** | `api/index.js:562-580`, `src/contexts/DataContext.jsx:70-74` |
| 2 | **IDOR: un cliente logueado puede editar/cancelar/reasignar/borrar la cita de cualquier otro cliente.** `PUT/PATCH/DELETE /api/appointments/:id` solo exige `verifyToken`, sin `requireOwnerOrRole` ni comprobación de que `req.user.id === appt.clientId`. Se puede cambiar `status`, `employeeId`, `finalPrice`, `date`, etc. de una cita ajena. | **Alta** | `api/index.js:678-716` |
| 3 | **IDOR: mascotas de cualquier dueño son legibles/editables/borrables por cualquier usuario autenticado.** `GET/PUT/PATCH/DELETE /api/pets/:id` solo tiene `verifyToken`, sin validar `ownerId`. Un cliente puede leer o modificar la ficha de la mascota de otro cliente (peso, notas, historial). | **Alta** | `api/index.js:312-387` |
| 4 | **`GET /api/pets` sin filtro obligatorio por rol.** El filtro `ownerId` es opcional (`req.query.ownerId`); un cliente puede omitirlo y listar todas las mascotas del negocio. | **Alta** | `api/index.js:312-321` |
| 5 | **Sin rate limit en `/api/login`.** `publicWriteLimiter` solo se aplicó a `/api/signup`, `/api/clients`, `/api/pets`, `/api/appointments` — el login queda abierto a fuerza bruta de contraseñas. | **Alta** | `api/index.js:83-101` |
| 6 | Contraseña por defecto predecible (`perrucho123`) cuando no se envía password, usada en 3 endpoints públicos/admin (`/api/signup`, `/api/clients`, `/api/users`). Cualquiera que conozca el email de un cliente registrado así podría intentar iniciar sesión con la contraseña por defecto antes de que la cambie. | **Media** | `api/index.js:113, 213, 272` |
| 7 | `PUT /api/users/:id` y `PUT /api/clients/:id` excluyen `password`/`role` del body pero aceptan el resto de campos sin whitelist (`...data` va directo a Prisma) — un usuario puede escribir campos que no debería tocar como `capacity` o `extraData` en su propio registro. Impacto bajo hoy, pero crece si `extraData`/`capacity` empiezan a tener lógica de negocio. | **Media** | `api/index.js:193-205, 284-296` |
| 8 | No hay `helmet` ni cabeceras de seguridad (CSP, X-Frame-Options, etc.); tampoco límites de tamaño de payload específicos por ruta (el límite global de 15 MB en `express.json()` aplica a rutas públicas como `/api/signup` también). | **Baja** | `api/index.js:50` |

### 1.2 Correctividad / bugs latentes (mismatches frontend↔backend)

| # | Hallazgo | Prioridad | Ubicación |
|---|---|---|---|
| 9 | El patrón que causó el bug ya resuelto (`STATUS_LABEL_TO_ENUM`/`STATUS_ENUM_TO_LABEL` para `AppointmentStatus`) **no se replicó en ningún otro enum**, pero por ahora el frontend usa los valores crudos del enum de Prisma para `PaymentMethod` (`efectivo/tarjeta/transferencia`) y `SaleStatus` (`pagado/pendiente`) — coinciden hoy. Riesgo: si alguien cambia las etiquetas visibles en `AdminDashboard.jsx`/`EmployeeDashboard.jsx` (líneas ~756-768, ~708-719) sin tocar el enum de Prisma, se repetirá el mismo crash. No hay ningún test que ancle estos valores al schema. | **Media** | `prisma/schema.prisma:31-40`, `src/pages/admin/AdminDashboard.jsx:756-768`, `src/pages/employee/EmployeeDashboard.jsx:708-719` |
| 10 | **Descuento de stock del POS no es atómico ni server-side.** Al vender un producto, el frontend calcula `o.stock - item.qty` en el cliente y lo manda como `PUT /api/products/:id` **separado** de la creación de la venta (`EmployeeDashboard.jsx:470-473`). Dos cajas vendiendo el mismo producto al mismo tiempo pueden generar stock negativo o inconsistente (la venta se crea igual aunque el `PUT` de stock falle después). El backend no valida stock disponible en `POST /api/sales`. | **Alta** | `src/pages/employee/EmployeeDashboard.jsx:470-473`, `api/index.js:797-812` |
| 11 | `POST /api/appointments` no valida que `serviceId`/`petId`/`clientId` referencien registros existentes ni que `finalPrice` sea coherente con el servicio elegido — un cliente del booking express podría, en teoría, mandar un `finalPrice` arbitrario si el frontend no lo calculara (actualmente confía en que el cliente HTTP nunca envíe ese campo, pero nada en el servidor lo impide). | **Media** | `api/index.js:638-668` |
| 12 | `getFullSlotsForDate` (disponibilidad) usa una ventana de ±59 min fija (`SHOP_TIME_SLOTS`, línea 24) duplicada entre frontend (`Home.jsx`) y backend, ligada por comentario, no por una fuente única — cualquier cambio de horario debe editarse en dos archivos manualmente, con el mismo tipo de riesgo de desincronización que ya causó el bug de estados. | **Media** | `api/index.js:22-24, 582-605` |

### 1.3 Calidad de código / mantenibilidad

| # | Hallazgo | Prioridad |
|---|---|---|
| 13 | `api/index.js` es un único archivo de ~900 líneas con toda la API (auth, users, clients, pets, services, products, appointments, sales, settings) y un patrón `try/catch` casi idéntico repetido ~35 veces. No hay separación en routers/controladores, lo que dificulta testear y mantener a medida que crece. | Media |
| 14 | Los componentes `AdminDashboard.jsx` (898 líneas) y `EmployeeDashboard.jsx` (892 líneas) concentran POS, calendario, KPIs, edición de catálogo, etc. en un solo archivo cada uno, con mucho JSX inline con estilos en línea (`style={{...}}`) repetidos entre ambos (el bloque de métodos de pago/estado de venta está literalmente duplicado línea por línea entre los dos dashboards). Buen candidato a extraer un componente `PosCheckoutPanel` compartido. | Media |
| 15 | Ningún endpoint de listado (`/api/clients`, `/api/pets`, `/api/appointments`, `/api/sales`, `/api/products`, `/api/services`, `/api/users`) tiene paginación — todo se trae completo en cada carga. Funciona con el volumen actual, pero no escala. | Media |
| 16 | Falta de índices explícitos en `schema.prisma` sobre columnas usadas para filtrar seguido: `Appointment.date`, `Appointment.clientId`, `Appointment.employeeId`, `Appointment.status`, `Sale.clientId`, `Sale.date`. Hoy Postgres/Neon hace table scans en esas consultas conforme crecen las citas. | Media |
| 17 | Imágenes (logo, hero, fotos de servicios/productos) se guardan como **data URL base64 dentro de columnas `String`/`Json`** en Postgres (`src/utils/imageUpload.js`, `Settings.logoUrl`, `Service.imageUrl`, etc.), en vez de subirse a un storage tipo Vercel Blob/S3/Cloudinary. Esto explica el límite de 15 MB en `express.json()`; infla el tamaño de la base de datos y de cada response que incluya esos registros, y no se benefician de CDN/caché de imágenes. | Media |
| 18 | Los mensajes de error del servidor son genéricos (`"Error del servidor"`) en todos los `catch`, lo que está bien de cara al usuario, pero no hay ningún sistema de logging/monitoreo estructurado (Sentry, etc.) más allá de `console.error` — en Vercel serverless esos logs son efímeros y difíciles de correlacionar con incidentes reales. | Baja |

### 1.4 Integridad de datos

| # | Hallazgo | Prioridad |
|---|---|---|
| 19 | Ver punto 10 (stock no atómico) — es a la vez un problema de integridad de datos y de concurrencia. | Alta |
| 20 | `Appointment.date`/`time` son `String` en vez de `DateTime`/`Time` (comentario explica que es deliberado para evitar timezone drift), lo cual es razonable, pero implica que **no hay validación de formato a nivel de base de datos** — un `PUT` mal formado podría guardar una fecha inválida (`"2026-13-45"`) sin que Prisma se queje, y romper el ordenamiento (`orderBy: [{date:'desc'}]`) que asume formato ISO consistente. | Media |
| 21 | No hay constraint de unicidad en `Appointment(date, time, employeeId)` — la prevención de doble-booking depende 100% de la lógica en `getFullSlotsForDate`, ejecutada en JS antes del insert. Bajo alta concurrencia (dos requests simultáneos) existe una ventana de carrera real entre el `findMany` de disponibilidad y el `create` (no están en una transacción con lock). | Media |
| 22 | `Product.variants`, `Service.customPriceOptions`, `Settings.howItWorksSteps/stats/footerLinks` son `Json` de forma libre, sin validación de esquema (ni con Zod ni a mano) antes de guardarlos — un payload malformado desde el admin panel puede corromper silenciosamente esos campos y solo se detecta cuando el frontend intenta leerlos. | Baja |

### 1.5 Rendimiento

| # | Hallazgo | Prioridad |
|---|---|---|
| 23 | Sin N+1 evidentes gracias al uso consistente de `include`, pero `GET /api/appointments` siempre trae `extras.service` completo aunque el consumidor (ej. lista del calendario) no lo necesite — falta de "vistas" livianas para listados vs. detalle. | Baja |
| 24 | Filtrado/orden de disponibilidad (`getFullSlotsForDate`) se calcula 100% en Node tras traer todas las citas del día — con el volumen actual es intrascendente, pero crecería linealmente sin índice en `(date, status)`. | Baja |

### 1.6 Cobertura de pruebas

Existe un conjunto de pruebas más amplio de lo que se mencionó (no es solo el boilerplate de CRA): `AuthContext.test.jsx`, `DataContext.test.jsx`, `pricingRules.test.js`, `apptStatus.test.js`, `formatPhone.test.js`, `bookingRules.test.js`, `emailNotify.test.js`, `whatsappNotify.test.js`, `Login.test.jsx`, `DashboardShared.test.jsx` (~1000 líneas de tests en total). Sin embargo:

- **Cero tests de `api/index.js`** — ningún test de integración/contrato golpea los endpoints Express directamente (ni con supertest ni similar). Todo el backend depende de pruebas manuales.
- No hay tests que verifiquen que las etiquetas usadas en la UI (`efectivo/tarjeta/pagado/pendiente`, etc.) siguen existiendo en los enums de `schema.prisma` — el tipo exacto de desalineación que ya causó el bug de "En proceso"/"Finalizada".
- No hay tests end-to-end (Playwright/Cypress) del flujo completo de booking express ni del POS.

**Prioridad: Alta** — dado que ya hubo un incidente en producción por desalineación frontend/backend, un test de contrato simple (ej. "todo status usado en AdminDashboard existe en AppointmentStatus/SaleStatus/PaymentMethod") sería barato de escribir y de alto valor preventivo.

---

## 2. Propuestas de mejora (benchmark de mercado)

Comparado con Booksy, Fresha, MoeGo, Gingr, Pawfinity, DaySmart Pet y Square Appointments, Perrucho ya cubre bien: booking sin cuenta ("express"), gestión de citas con calendario por empleado/capacidad, POS con productos+servicios+variantes, catálogo de servicios por peso, branding/personalización completo (logo, colores, hero, "cómo funciona"), fichas de mascota con historial, multi-rol (admin/empleado/cliente), y adaptabilidad a otros giros de negocio (`enablePets`, `clientExtraFields`). Lo que falta, ordenado por lo que más mueve la aguja para un negocio de grooming real:

| # | Propuesta | Por qué importa | Prioridad |
|---|---|---|---|
| 1 | **Recordatorios automáticos de cita** (WhatsApp/SMS/email 24h y 2h antes). Hoy `whatsappNotify.js`/`emailNotify.js` existen pero, a juzgar por el flujo, se disparan solo al crear/confirmar la cita manualmente — no hay un job programado de recordatorio. Esta es la feature #1 que reduce no-shows en Booksy/MoeGo/Fresha y es la más pedida por dueños de negocio. | **Alta** |
| 2 | **Cobro de depósito/anticipo en línea** al reservar (Stripe/Mercado Pago) para citas del booking express, con política de cancelación. Fresha y MoeGo lo usan como filtro anti no-show. Perrucho hoy solo registra pagos en el POS presencial (`PaymentMethod: efectivo/tarjeta/transferencia`), no hay integración de pagos online. | **Alta** |
| 3 | **Reservas recurrentes / "traer cada 4-6 semanas"**: opción de agendar una serie de citas repetidas (mismo servicio, mismo groomer) en vez de una por una. Es un básico en Pawfinity/Gingr para retención de clientes de grooming regular. | **Media** |
| 4 | **Lista de espera (waitlist)** cuando un horario está lleno — hoy `getFullSlotsForDate` simplemente oculta el slot lleno (`api/index.js:600-604`) en vez de ofrecer anotarse para ser notificado si se libera. | **Media** |
| 5 | **Gestión de ausencias/horario de empleados** (vacaciones, días libres, horario variable por día). Actualmente solo existe `capacity` fijo por empleado (`User.capacity`) sin concepto de disponibilidad temporal — un empleado de baja sigue contando en `totalCapacity` de `getFullSlotsForDate`. | **Alta** (impacta directamente la lógica de disponibilidad ya construida) |
| 6 | **Registro de vacunas / cartilla sanitaria** por mascota con fecha de vencimiento y alertas — el modelo `Pet` tiene `history: Json` genérico pero nada estructurado para vacunas/alergias, algo estándar en Gingr/Pawfinity y relevante para grooming (requisito de muchos negocios antes de aceptar la mascota). | **Media** |
| 7 | **Dashboard de reportes/analítica** (ingresos por período, servicios más vendidos, tasa de no-shows, clientes recurrentes vs. nuevos, ticket promedio). Hoy `AdminDashboard.jsx` muestra listados y KPIs puntuales, no un módulo de reportes exportable — aunque ya existe `xlsx` como dependencia, sugiriendo que se pensó exportar algo pero no está aprovechado a fondo. | **Media** |
| 8 | **Multi-sucursal**: el modelo de datos es de un solo negocio (`Settings` con `id` fijo = 1, sin `locationId` en ningún modelo). Si Taylor's Pet Services u otro cliente de Cibercom abre una segunda sucursal, hoy no hay forma de separar catálogo/citas/empleados por ubicación sin una migración de esquema. Vale la pena dejarlo diseñado aunque no se construya ya. | **Baja** (a menos que haya un cliente concreto con 2+ sucursales) |
| 9 | **Paquetes / membresías** (ej. "5 baños prepagados", suscripción mensual). El pricing actual es 100% por transacción (`Service.pricingMode: weight/custom`); no hay concepto de saldo prepagado o suscripción recurrente, que es una fuente de ingresos recurrentes típica en Fresha/MoeGo. | **Media** |
| 10 | **Antes/después por mascota vinculado a la cita**: ya existe subida de imágenes (`imageUpload.js`) para catálogo/branding, pero no hay galería de fotos "antes/después" asociada a cada `Appointment`/`Pet` — es una feature de marketing y confianza muy usada en grooming (Instagram-ready) que aprovecharía la infraestructura de imágenes que ya tienen, aunque debería moverse a un storage externo (ver punto 17 del audit) antes de escalarla. | **Media** |
| 11 | **Gestión de reputación / reseñas**: hay enlaces a redes sociales en `Settings` pero no hay flujo de solicitar reseña post-servicio (Google/Facebook) ni mostrar testimonios dinámicos — hoy es contenido estático editable a mano. | **Baja** |
| 12 | **Programa de lealtad** (puntos, referidos, cliente frecuente) — no existe ningún campo relacionado a puntos/fidelidad en el modelo `User`. Común en Booksy/Square Appointments como retención. | **Baja** |

---

### Resumen ejecutivo (1 minuto)

Los hallazgos de seguridad más urgentes son tres fugas de datos entre clientes (IDOR en citas y mascotas) — hoy cualquier cliente logueado puede ver y en algunos casos editar información de **otros** clientes, incluyendo el caso confirmado de que el propio frontend ya lo dispara sin querer. Junto con la falta de rate limit en login y el descuento de stock no atómico en el POS, son los cuatro puntos a resolver primero. En features, lo que más impacto de negocio tendría a corto plazo es automatizar recordatorios de cita y habilitar cobro de depósito en línea, seguido de manejo de ausencias de empleados (que además corrige un supuesto ya roto en el cálculo de disponibilidad).

> **Actualización (misma sesión, después de esta auditoría):** ya se corrigieron los 3 IDOR de citas/mascotas y se agregó rate limit a `/api/login`. También se implementaron modo oscuro/claro, personalización extendida (color secundario, tipografía, tema por defecto) y una pestaña "Analíticos" nueva en el panel admin (ingresos vs. egresos, más vendidos, ticket promedio, tasa de cancelación, clientes nuevos). Las secciones 3 y 4 de abajo son la continuación de esta auditoría: qué más se podría construir en analíticos y, en concreto, cómo automatizar procesos para un negocio de veterinaria o tienda de mascotas que use esta plataforma.

---

## 3. Analíticos — qué más se podría construir

Lo ya implementado (esta sesión) cubre lo básico: ingresos vs. egresos en el tiempo, ranking de más vendidos, ticket promedio, tasa de cancelación y clientes nuevos, todo calculado en el navegador sobre los datos que ya carga la app (sin endpoints nuevos). Con más tiempo/alcance, lo siguiente es lo que más valor agregaría, ordenado por impacto:

| # | Propuesta | Por qué importa | Prioridad |
|---|---|---|---|
| 1 | **Retención y frecuencia de visita por cliente** (días desde la última cita, promedio de días entre visitas, "en riesgo de fuga" si pasó 2x su intervalo habitual sin agendar). Hoy "clientes nuevos" existe pero no hay señal de qué clientes recurrentes se están enfriando — es la métrica que más previene pérdida de ingresos en un negocio de servicios recurrentes como grooming. | **Alta** |
| 2 | **Desempeño por empleado**: ventas/citas atendidas, ticket promedio, tasa de cancelación y calificación (si se agrega punto 11 de la sección 4) por groomer/empleado — hoy `Sale.employeeId` y `Appointment.employeeId` ya existen en el schema pero no se explotan en ningún reporte. Útil para bonos/comisiones y para detectar quién necesita apoyo. | **Alta** |
| 3 | **Ocupación de agenda (heatmap por hora/día)**: qué horarios están sistemáticamente llenos vs. vacíos, para ajustar `SHOP_TIME_SLOTS` o la capacidad de empleados por franja en vez de un horario fijo todo el día. | **Media** |
| 4 | **Cohortes de clientes**: ingresos generados por clientes que llegaron cada mes, para ver si el negocio depende de clientes nuevos o de recurrencia (LTV aproximado). | **Media** |
| 5 | **Exportación real de reportes** (`xlsx` ya es una dependencia del proyecto pero solo se usa para exportar el detalle de ventas del mes) — extender el botón "Exportar" a Analíticos completo, con un reporte multi-hoja (ventas, egresos, top productos, por empleado). | **Media** |
| 6 | **Comparativo período contra período** (este mes vs. mes anterior, con flechas ↑/↓ de variación %) en cada KPI — hoy los números son absolutos, sin contexto de si van mejor o peor. | **Media** |
| 7 | **Alertas proactivas automáticas**: en vez de que el admin tenga que entrar a revisar, que el sistema avise solo cuando algo se sale de rango (ej. "egresos superaron ingresos esta semana", "3 cancelaciones seguidas del mismo cliente"). Ver también sección 4, punto 9. | **Baja** (depende de tener un canal de notificación — email/WhatsApp del negocio) |

---

## 4. Automatización de procesos — pensado para veterinaria / tienda de mascotas

Estas son las automatizaciones concretas que más aliviarían la carga operativa diaria de un negocio de grooming/veterinaria/pet shop usando esta plataforma. Todas parten de datos que el modelo actual ya tiene (o casi) — se marca cuándo hace falta un campo nuevo.

| # | Automatización | Cómo funcionaría | Requiere | Prioridad |
|---|---|---|---|---|
| 1 | **Recordatorio automático de cita** (24h y 2h antes, por WhatsApp) | Job programado (cron) que revisa citas del día siguiente/próximas 2h y dispara el mensaje solo — hoy `whatsappNotify.js` genera el link pero un humano tiene que abrirlo y darle enviar. | Un job en background (Vercel Cron o similar) + WhatsApp Business API (hoy el envío es manual vía `wa.me`, que no se puede automatizar sin intervención humana — para automatizar de verdad se necesita la API oficial de Meta o un proveedor como Twilio). | **Alta** |
| 2 | **Reagendado automático de "trae a tu mascota en X semanas"** | Al marcar una cita como "Finalizada", si el servicio tiene un intervalo recomendado configurado (ej. grooming cada 5 semanas), el sistema pre-crea una cita sugerida esa fecha y le manda al cliente un link de 1 clic para confirmarla — en vez de esperar a que el cliente recuerde agendar solo. | Campo nuevo `recommendedIntervalWeeks` en `Service`, + trigger al cambiar `status` a `Completada`. | **Alta** |
| 3 | **Recordatorio de vacunas/desparasitación por mascota** | Con un registro estructurado de vacunas (ver auditoría punto 6, hoy `Pet.history` es un JSON libre sin fechas de vencimiento), el sistema puede mandar un recordatorio automático "la vacuna X de {mascota} vence en 2 semanas" — muy valorado en veterinaria, no solo grooming. | Modelo `PetVaccine{ petId, name, appliedDate, nextDueDate }` + job diario que revisa vencimientos. | **Alta** (si el negocio es veterinaria, no solo estética) |
| 4 | **Reposición automática de inventario**: cuando `stock` cruza el umbral de "stock crítico" (ya existe esa alerta visual en el Panel), generar automáticamente un borrador de orden de compra al proveedor configurado por producto, en vez de solo mostrar la alerta y esperar que el admin actúe. | Campo `supplierContact`/`reorderQty` en `Product` + botón "Generar orden" que arma un mensaje/PDF listo para enviar (o, más adelante, integración directa con el proveedor). | **Media** |
| 5 | **Consumo automático de insumos por servicio**: hoy vender un servicio de grooming no descuenta shampoo/insumos del inventario (solo los productos que se venden directamente en el POS se descuentan). Si cada `Service` declarara qué productos consume y en qué cantidad, el stock de insumos se descontaría solo al marcar una cita como completada — hoy ese control es 100% manual y probablemente impreciso. | Relación `ServiceConsumable{ serviceId, productId, qty }` + descuento server-side atómico al finalizar la cita (aprovechando el mismo fix de atomicidad de stock que ya se recomendó en la sección 1.2). | **Media** |
| 6 | **Comisiones de empleados automáticas**: calcular al cierre del mes cuánto le corresponde a cada empleado según sus ventas/servicios atendidos (con un % configurable por empleado o por tipo de servicio), en vez de calcularlo a mano con el reporte de ventas. | Campo `commissionRate` en `User` (rol empleado) + reporte mensual (aprovecha el punto 2 de analíticos). | **Media** |
| 7 | **Solicitud automática de reseña post-servicio**: X horas después de marcar una cita "Finalizada", enviar automáticamente (WhatsApp/email) el link a Google/Facebook para pedir una reseña — hoy los enlaces a redes existen en `Settings` pero nadie los usa proactivamente. | Mismo job de recordatorios (punto 1) + plantilla de mensaje. | **Media** |
| 8 | **Mensaje automático de cumpleaños de la mascota** (o aniversario de cliente) con un cupón/descuento — común en Pawfinity/MoeGo como retención emocional de bajo costo. | Campo `birthDate` en `Pet` (parcialmente ya cubierto por `age`, pero no como fecha exacta) + job diario. | **Baja** |
| 9 | **Alertas automáticas al negocio, no solo al cliente**: "vas 3 cancelaciones seguidas del mismo cliente", "quedan menos de 3 citas libres esta semana", "un empleado no tiene citas asignadas mañana" — mensajes push/WhatsApp al dueño en vez de que tenga que entrar a revisar Analíticos manualmente. | El mismo job/cron de los puntos anteriores, evaluando reglas simples sobre los datos ya existentes. | **Baja** |
| 10 | **Waitlist automática**: si un horario está lleno y se cancela una cita, notificar automáticamente (en orden) a los clientes que pidieron quedar en lista de espera para ese día — hoy `getFullSlotsForDate` solo oculta el horario lleno, no ofrece anotarse. | Modelo `Waitlist{ clientId, date, notified }` + trigger en `DELETE`/cancelación de cita. | **Media** |
| 11 | **Ficha de salud consolidada por mascota** (peso histórico, alergias, medicamentos, notas de cada visita) que el groomer/veterinario puede completar en 30 segundos al finalizar, en vez de anotar todo en el campo `notes` de texto libre de la cita — esto no es automatización per se, pero es el prerequisito de datos estructurados para que los puntos 3, 2 y las alertas de la sección 3 funcionen bien. | Extender `Pet.history` (hoy JSON libre) a una tabla estructurada. | **Alta** (habilita varias de las anteriores) |

**Nota honesta sobre WhatsApp:** varias de estas automatizaciones (1, 2, 7, 9) requieren poder *enviar* un mensaje de WhatsApp sin que un humano lo confirme — hoy toda la integración de WhatsApp en el proyecto (`whatsappNotify.js`) usa enlaces `wa.me` que abren la app y esperan que alguien presione "enviar". Para automatizar de verdad hace falta contratar la API oficial de WhatsApp Business (Meta) o un proveedor como Twilio/360dialog, lo cual tiene costo por mensaje y un proceso de aprobación de plantillas — vale la pena dejarlo presupuestado como parte de esta propuesta, no es gratis ni inmediato.
