# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dueños/administradores de negocios de servicios con agenda (veterinarias y
estéticas caninas, salones de uñas, salones de pestañas, spas, barberías,
clínicas dentales/consultorios, gimnasios y estudios de clases) que hoy
gestionan su operación con WhatsApp, hojas de cálculo o cuadernos, y están
buscando activamente un sistema — llegan a las landing pages comparando
opciones, no con la decisión ya tomada. Necesitan convencerse con
beneficios concretos de su propio giro antes de registrarse.

## Product Purpose

Emporio es un gestor de negocios multi-tenant: agenda de citas, punto de
venta, inventario y gestión de clientes/personal en un solo panel, con una
página pública propia por negocio para que sus clientes reserven solos.
Existe para que un negocio de servicios deje de operar por WhatsApp/papel y
tenga un sistema real sin pagar por (ni aprender) un software genérico de
"cualquier negocio".

## Positioning

No es un gestor de negocios genérico con un selector de industria en el
onboarding — es un gestor especializado por giro: cada giro tiene su propio
preset de catálogo, campos de cliente (ej. alergias en salones de uñas/
pestañas, padecimientos en clínicas) y ahora su propia landing de venta
("el sistema para salones de uñas" en vez de "el sistema para negocios").
Un competidor genérico no puede copiar esto sin fragmentar su propio
producto por vertical.

## Operating Context

- Cada negocio vive en `/:giro/:slug` (ej. `/uñas/mi-salon`) — el giro en
  la URL es descriptivo, la resolución real es por slug único.
- Alta 100% self-service en `/crear-negocio`, gratis mientras el producto
  está en pruebas (sin cobro todavía, se agregará más adelante).
- Cada giro tiene su propia landing de marketing en `/:giro` (ej. `/uñas`)
  que lleva al alta con el giro preseleccionado.
- La cuenta se crea en modo AEGIS (proveedor de identidad externo) —
  contraseña temporal generada por el sistema, mostrada una vez.

## Capabilities and Constraints

- Giros activos hoy: veterinaria/grooming, salón de uñas, salón de
  pestañas, spa, barbería, clínica dental/consultorio, gimnasio — la lista
  crece solo agregando código (`src/config/giroPresets.js`,
  `src/config/giroMarketing.js`), sin migración de base de datos.
- Stack: React (Create React App, sin Tailwind) + Express/Prisma/Postgres
  (Neon). Tokens de diseño ya existentes en `src/styles/tokens.css`.
- Cada landing de giro usa una fotografía de stock (Unsplash) representativa
  — no hay fotografía propia de cada negocio todavía.
- Sin pago/checkout implementado — el registro es gratuito por ahora.

## Brand Commitments

- Nombre de la plataforma: **Emporio** (rebrand reciente desde "Perrucho" —
  el nombre viejo puede quedar en nombres de archivo/variables internas,
  nunca en texto visible al usuario).
- Ícono genérico de marca: `src/assets/perrucho-mark.svg` (huella de pata
  en cuadrado azul redondeado) — placeholder mientras se define una
  identidad visual real; puede evolucionar con este rediseño.
- **Dirección visual (elegida explícitamente sobre una dirección más
  arriesgada):** estándar de categoría SaaS de agenda/booking, ejecutado a
  la calidad de **Calendly + Fresha + Linear** — composición limpia tipo
  tarjeta, jerarquía tipográfica clara, micro-interacciones cuidadas
  (Linear como vara de pulido), sin ironía ni desviación experimental.
- Cada negocio registrado tiene su propia marca (nombre, logo, colores) que
  vive en su propia página — la marca "Emporio" es solo de la plataforma
  (landing, alta de negocio, panel maestro), nunca se mezcla con la de un
  negocio ya registrado.

## Evidence on Hand

- Un solo negocio real operando: Taylor's Pet Services (giro mascotas), 17
  usuarios reales.
- Dos negocios de demostración con datos de ejemplo (Emporio Uñas, Emporio
  Pestañas) — no son clientes reales, no se pueden presentar como prueba
  social.
- **Sin testimonios, sin número de clientes real que mostrar, sin logos de
  clientes.** Las landing pages no deben inventar ni insinuar prueba social
  (contadores, testimonios, "usado por cientos de negocios", etc.) — la
  persuasión debe apoyarse en el producto mismo (mecanismo, especialización
  por giro, capacidades concretas), no en números que no existen.

## Product Principles

1. Especialización por giro es el diferenciador — cada superficie de venta
   (landing general, landing de giro, alta de negocio) debe reforzar "esto
   está hecho para TU tipo de negocio", no vender un genérico.
2. Cero prueba social fabricada — mejor una landing que persuada por
   mecanismo/capacidad real que una que presuma números falsos.
3. La marca de la plataforma (Emporio) y la marca de cada negocio
   registrado nunca se pisan — un visitante siempre sabe si está viendo la
   plataforma o un negocio específico.
4. Self-service de principio a fin — cualquier fricción nueva en el
   rediseño debe medirse contra "¿esto ayuda a que alguien se registre
   solo, sin llamada de ventas?".
