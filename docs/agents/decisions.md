# decisions.md

Decisiones de arquitectura del proyecto Repitt API.

**Formato:**
```
## [Título] — YYYY-MM-DD
**Contexto:** por qué surgió la necesidad
**Decisión:** qué se decidió
**Por qué:** razón o trade-off
```

---

## Drizzle ORM sobre TypeORM/Prisma — 2026-03-18

**Contexto:** Necesidad de un ORM para PostgreSQL en un proyecto NestJS nuevo.

**Decisión:** Usar Drizzle ORM con postgres.js como driver.

**Por qué:** Drizzle es type-safe a nivel de query (el tipado viene del schema, no de decoradores en clases). Más liviano que Prisma, sin generación de código en runtime. postgres.js tiene mejor performance que pg/node-postgres para queries de alto volumen.

---

## Supabase solo para storage, no para auth — 2026-03-18

**Contexto:** El proyecto usa Supabase JS SDK pero también tiene auth propia con JWT.

**Decisión:** Supabase se usa exclusivamente como storage de archivos (QRs, logos, flyers). La autenticación corre con JWT local + bcrypt + Passport.

**Por qué:** Control total sobre el modelo de usuarios y roles. No depender de la gestión de usuarios de Supabase permite más flexibilidad en el schema (RepittCode, roles propios, etc.).

---

## Onboarding unificado usuario + negocio en AuthModule — 2026-03-18

**Contexto:** Un dueño de negocio necesita crear usuario y negocio en el mismo flujo.

**Decisión:** El endpoint `POST /auth/onboarding` maneja ambos casos (usuario solo o usuario + negocio) usando un único DTO con campos opcionales de negocio.

**Por qué:** Simplifica el flujo del cliente (una sola llamada). La transacción de DB garantiza atomicidad — si falla la creación del negocio, tampoco se crea el usuario.

---

## Soft delete en todas las tablas — 2026-03-18

**Contexto:** Necesidad de poder recuperar datos eliminados y mantener historial.

**Decisión:** Todas las tablas tienen columna `deletedAt timestamp`. Los registros nunca se borran físicamente.

**Por qué:** Trazabilidad para soporte y auditoría. En un sistema de lealtad, perder visitas o stamp cards sería crítico. Trade-off: hay que recordar filtrar `deletedAt IS NULL` en queries (aún no implementado consistentemente — ver gotchas.md).

---

## DatabaseModule como módulo global con token de inyección — 2026-03-18

**Contexto:** Múltiples módulos necesitan acceso a la DB.

**Decisión:** `DatabaseModule` es `@Global()` y expone el cliente Drizzle con el token `DATABASE_CONNECTION`. Los servicios lo inyectan con `@Inject(DATABASE_CONNECTION)`.

**Por qué:** Evita importar DatabaseModule en cada feature module. Un único cliente de conexión compartido (singleton) es más eficiente que múltiples conexiones.

---

## repittCode solo en recurso raíz, sub-recursos usan businessId — 2026-03-18

**Contexto:** La regla del proyecto es usar repittCode en rutas públicas. Pero al aplicarlo en sub-recursos anidados (`/businesses/:repittCode/stamp-cards`), Express/NestJS no puede distinguir `:repittCode` de `:businessId` — son el mismo patrón de URL y el primer controller registrado gana siempre.

**Decisión:** La regla del repittCode aplica únicamente al recurso raíz (`GET /businesses/:repittCode`). Los sub-recursos anidados usan businessId numérico para ambas vistas (pública y privada).

**Por qué:** Evita conflictos reales de routing. El frontend obtiene el `businessId` desde la respuesta del negocio y puede usarlo para los sub-recursos. Es práctica estándar REST — recursos anidados referencian al padre por su ID estable.

---

## Stamp cards como sub-recurso de businesses — 2026-03-18

**Contexto:** Las stamp cards inicialmente tenían rutas propias (`/stamp-cards/business/:id`), lo que duplicaba el `businessId` entre la URL y el body del DTO en el POST.

**Decisión:** Mover stamp cards a rutas anidadas bajo businesses: `GET|POST /businesses/:businessId/stamp-cards`.

**Por qué:** REST semántico — una stamp card siempre pertenece a un negocio. El `businessId` en la URL elimina la redundancia del DTO y hace la jerarquía de recursos explícita. NestJS soporta esto nativamente con `@Controller('businesses/:businessId/stamp-cards')`.

---

## Convención /me para endpoints privados de owner — 2026-03-18

**Contexto:** Necesidad de diferenciar la vista pública de un recurso (solo activos) de la vista privada del dueño (todos los estados).

**Decisión:** El sufijo `/me` indica que el endpoint requiere JWT y retorna datos del recurso desde la perspectiva del owner autenticado. Ejemplo: `GET /businesses/:id/stamp-cards/me` vs `GET /businesses/:id/stamp-cards`.

**Por qué:** Patrón consistente con `GET /users/me` y `GET /businesses/me`. Evita query params (`?view=owner`) y mantiene URLs limpias y predecibles.

---

## visitsCount como campo desnormalizado en DB — 2026-03-21

**Contexto:** Al registrar una visita, hay que saber cuántas visitas acumula una `userStampCard` para determinar si se completó. Dos opciones: calcularlo en runtime (COUNT en cada read) o almacenarlo.

**Decisión:** `visitsCount` es un campo numérico almacenado en `user_stamp_cards`, incrementado transaccionalmente en `registerVisit`.

**Por qué:** Evita un COUNT en cada lectura de la tarjeta del usuario. La consistencia está garantizada porque el incremento ocurre dentro de la misma transacción que inserta el `visit`. Trade-off: si `requiredStamps` cambia en una stamp card con tarjetas activas, el `isCompleted` de esas tarjetas puede quedar desfasado (edge case conocido, no resuelto actualmente).

---

## isCompleted se almacena al momento del scan, no se recalcula — 2026-03-21

**Contexto:** Necesidad de saber si una `userStampCard` está completada sin hacer queries adicionales.

**Decisión:** `isCompleted` se establece a `true` en la misma transacción de `registerVisit` cuando `visitsCount >= requiredStamps`. No hay lógica de recálculo en los endpoints de lectura.

**Por qué:** Los reads son más simples y performantes — pueden filtrar por `isCompleted = true` directamente. La consistencia está garantizada porque se setea en la misma transacción que incrementa `visitsCount`.

---

## redeemedAt y completedAt en lugar de updatedAt para filtros de fecha — 2026-03-21

**Contexto:** Las métricas necesitan filtrar recompensas canjeadas y tarjetas completadas por rango de fechas. El campo `updatedAt` se actualiza en cualquier mutación del registro, no solo al completarse o canjearse.

**Decisión:** Usar `completedAt` (timestamp cuando `isCompleted` pasa a `true`) y `redeemedAt` (timestamp cuando `isRewardRedeemed` pasa a `true`) como base para los filtros de métricas.

**Por qué:** `updatedAt` causaría falsos positivos — un registro completado hace 3 meses que se modifica hoy aparecería en el rango "este mes". `redeemedAt`/`completedAt` son semánticamente precisos y corrigen un bug del sistema Laravel original.

---

## growth: null cuando previous = 0 (en métricas) — 2026-03-21

**Contexto:** Al calcular el crecimiento porcentual entre dos períodos, si el período anterior es 0 la división es indefinida. El sistema Laravel original retornaba 100%.

**Decisión:** `growth` retorna `null` cuando `previous = 0`, en lugar de un valor hardcodeado.

**Por qué:** Retornar 100% cuando `previous = 0` es matemáticamente incorrecto y confuso — no hay base de comparación. `null` es semánticamente honesto ("no calculable"). El frontend debe manejar `null` mostrando "N/A" o "—".

---

## visitsByMonth siempre retorna los 12 meses — 2026-03-21

**Contexto:** La query de visitas agrupadas por mes solo retorna filas donde hay visitas. Los meses sin datos no aparecen en el resultado de DB.

**Decisión:** El servicio rellena los meses faltantes con `visitsCount: 0` usando un `Map` + `Array.from({ length: 12 })`. Siempre se retornan exactamente 12 objetos `{ month, visitsCount }`.

**Por qué:** El frontend puede renderizar el gráfico directamente sin lógica de relleno. El mes se retorna como número (1-12) para que el front maneje la localización — evita hardcodear nombres de mes en inglés o español en el backend.

---

## Dos flujos de scan para registrar visitas — 2026-03-21

**Contexto:** Un visitante puede ser escaneado de dos formas: el owner escanea el QR del usuario y selecciona la stamp card, o el owner escanea directamente el QR de la `userStampCard`.

**Decisión:** `POST /visits/scan` acepta dos combinaciones de campos:
1. `userRepittCode + stampCardId` — escanea usuario y especifica la tarjeta
2. `userStampCardRepittCode` — escanea directamente la tarjeta del usuario (12 dígitos, formato distinto al repittCode de usuario)

**Por qué:** Flexibilidad de UI — algunos flujos muestran el QR del usuario genérico, otros el QR específico de cada tarjeta. El servicio detecta cuál flujo usar por qué campos llegaron en el body.

---

## Métricas accesibles solo por el owner del negocio — 2026-03-21

**Contexto:** Las métricas contienen datos sensibles de clientes y performance del negocio.

**Decisión:** `GET /businesses/:businessId/metrics` verifica que el `userId` del JWT sea el dueño del `businessId`. `ForbiddenException` si no coincide.

**Por qué:** Datos de negocio privados. El `businessId` en la URL no es suficiente — cualquier usuario autenticado podría acceder a métricas ajenas sin la verificación de ownership.

---

## POST /businesses no crea stamp card default — 2026-03-21

**Contexto:** El onboarding (`POST /auth/onboarding`) crea automáticamente una stamp card default al crear el negocio. Al implementar `POST /businesses` (creación de negocio adicional para owner ya autenticado), surgió la pregunta de si replicar ese comportamiento.

**Decisión:** `POST /businesses` NO crea stamp card por defecto. Solo crea el negocio con QR y flyer.

**Por qué:** El onboarding tiene sentido hacerlo todo junto porque es el primer negocio del usuario y necesita algo que mostrar de inmediato. En creaciones posteriores, el owner ya conoce el flujo y creará sus stamp cards manualmente con `POST /businesses/:businessId/stamp-cards`. Una stamp card vacía/placeholder sería más confusa que útil.

---

## Generación de assets (QR + flyer) en el flujo de registro — 2026-03-18

**Contexto:** Cada negocio necesita QR y flyer listos para usar desde el momento de creación.

**Decisión:** AuthService genera QR codes y flyers síncronamente durante el registro, como parte de la transacción de onboarding.

**Por qué:** Garantiza que el negocio siempre tiene sus assets disponibles al ser creado. Trade-off: el endpoint de onboarding es lento (IO de Supabase + Sharp). A evaluar si mover a background jobs en el futuro.

---

## Registro de visitante sin OTP — verificación diferida — 2026-03-23

- Visitante se registra solo con firstName + phone, sin contraseña ni email
- Modelo: OXXO Premia / Monedero Chedraui — registro de 5 segundos, cero fricción
- OTP de verificación se dispara en el PRIMER CANJE, no en el registro
- Razón: en programas de lealtad la fricción en registro mata adopción; el cajero no puede esperar un código
- Riesgo de números falsos es bajo: sin teléfono real no recibes beneficios, no hay incentivo para mentir
- Métrica valiosa para el owner: usuarios registrados vs verificados en dashboard

## Separación de proveedores de comunicación — 2026-03-23

- Infobip → OTP WhatsApp + fallback SMS (rutas directas LATAM, entrega < 5s)
- Brevo → emails transaccionales, notificaciones, marketing
- Justificación: canales distintos, no se superponen; Brevo ya funciona con templates activos

## Login separado por rol — 2026-03-23

- `POST /auth/login` → solo owners (email + password + bcrypt)
- `POST /auth/visitor/login` → solo visitantes (phone → OTP WhatsApp, pendiente Infobip)
- Razón: flujos completamente distintos, no tiene sentido mezclarlos en un endpoint

---

## OTP removido del login de visitante para MVP — 2026-03-25

**Contexto:** El plan original era que el login de visitante usara OTP vía WhatsApp (Infobip). Infobip aún no está disponible (pendiente número WA).

**Decisión:** Para MVP, `POST /auth/visitor/login` implementa phone → JWT inmediato. OTP se añadirá cuando Infobip esté operativo, sin cambiar el contrato del endpoint (solo cambia la implementación del service).

**Por qué:** No bloquear el MVP por un proveedor externo no confirmado. OTP agrega fricción sin valor real en una loyalty app de bajo riesgo. Los visitantes no pierden nada si alguien usa su teléfono — no hay pagos ni datos sensibles en juego.

---

## OTP desacoplado del flujo de auth — no en primer canje — 2026-03-25

**Contexto:** Se había planteado disparar el OTP de verificación al momento del primer canje (no en el registro ni en el login).

**Decisión:** Descartado. OTP será un flujo independiente y opcional cuando Infobip esté disponible.

**Por qué:** El trigger en primer canje tiene timing incómodo — el visitante está en el mostrador esperando su recompensa. Mejor alternativa: soft prompt post-registro o banner en el perfil del visitante.

---

## lastName requerido en visitor registration — 2026-03-25

**Contexto:** `POST /auth/visitor/register` originalmente solo requería `firstName` + `phone`. Se añadió el CRM de clientes (`GET /businesses/:businessId/customers`).

**Decisión:** `lastName` pasa a ser campo requerido en el registro de visitante.

**Por qué:** CRM mínimo viable — el owner necesita identificar al cliente por nombre completo. Un solo nombre es insuficiente para distinguir entre múltiples "Carlos" o "María" en una lista de clientes.

---

## register-customer como upsert por teléfono — 2026-03-25

**Contexto:** Los owners en punto de venta necesitan registrar a un cliente nuevo y darle su primer sello en una sola operación (sin que el cliente tenga la app ni un QR).

**Decisión:** `POST /businesses/:businessId/visits/register-customer` implementa upsert: si el teléfono ya existe en la DB, usa el usuario existente en lugar de crear uno nuevo. Devuelve `isNew: boolean` para que el owner sepa si fue un registro nuevo o un cliente recurrente que ya existía.

**Por qué:** En punto de venta el owner no sabe si el visitante ya existe en el sistema. El upsert evita duplicados de usuario por teléfono y es transparente para el owner.

---

## Tres modalidades de scan en POST /visits/scan — 2026-03-25

**Contexto:** Originalmente existían dos modalidades de scan. Se añadió una tercera para operación manual.

**Decisión:** `POST /businesses/:businessId/visits/scan` acepta tres combinaciones:
1. `{ userStampCardRepittCode }` — QR específico de la tarjeta del visitante
2. `{ userRepittCode, stampCardId }` — QR genérico del usuario + stamp card seleccionada
3. `{ phone, stampCardId }` — búsqueda por teléfono (sin QR)

**Por qué:** Modalidad 3 cubre el caso de tablets en mostrador sin cámara, o cuando el visitante no tiene su QR a mano. El servicio detecta el flujo por los campos presentes en el body. Prioridad: si llega `userStampCardRepittCode` tiene precedencia sobre los demás.

---

## Billing schema agnóstico de proveedor — 2026-03-25

**Contexto:** Se diseñó el schema de billing pensando en Stripe como primer proveedor pero sin querer atarse a su naming.

**Decisión:** Las tablas `subscriptions`, `subscription_items` y `billing_webhook_events` usan `provider` (string) + `providerSubId` / `providerEventId` en lugar de campos específicos de Stripe (`stripeSubId`, etc.). `users.plan` es un campo denormalizado actualizado por el webhook handler.

**Por qué:** Evitar migración horizontal si en el futuro se cambia de proveedor o se soporta más de uno. El schema es consciente del proveedor (lo almacena) pero no asume que es Stripe.

**Estado:** Migrado. Implementado en el módulo de billing.

---

## Stripe Customer vinculado al negocio, no al usuario — 2026-03-26

**Contexto:** El modelo de negocio de Repitt permite que un owner tenga múltiples negocios, cada uno con su propio plan de suscripción.

**Decisión:** 1 Stripe Customer = 1 Negocio. El campo `businesses.stripeCustomerId varchar(255)` almacena el ID del customer en Stripe. La tabla `subscriptions` tiene FK `businessId` en lugar de `userId`.

**Por qué:** Cada negocio es una unidad de facturación independiente. Un segundo negocio del mismo owner genera una nueva suscripción con su propio Stripe Customer — no se comparte el customer. `users.billingCustomerId` queda deprecado y ya no se usa en el flujo nuevo.

---

## businesses.isActive controlado por webhooks de Stripe — 2026-03-26

**Contexto:** Los negocios necesitan un estado activo/inactivo que refleje si tienen suscripción vigente.

**Decisión:** `businesses.isActive` tiene default `false`. El webhook `checkout.session.completed` lo pone en `true`. El webhook `customer.subscription.deleted` lo vuelve a `false`. El checkout crea el Stripe Customer por negocio y guarda el ID.

**Por qué:** El estado de activación del negocio es una consecuencia directa del pago — no puede vivir solo en el lado del cliente. Los webhooks garantizan que el estado en DB sea siempre consistente con Stripe, incluso ante fallos de red o timeouts del checkout.

---

## loginVisitor siempre retorna Visitor — 2026-03-27

**Contexto:** `loginVisitor` no requiere contraseña, solo teléfono. Un owner también puede tener teléfono registrado.

**Decisión:** `POST /auth/visitor/login` retorna siempre `role: 'Visitor'`, sin consultar si el usuario tiene negocios.

**Por qué:** Seguridad — si derivara el rol desde businesses, cualquiera con el teléfono de un owner obtendría un JWT con `role: 'Owner'` sin contraseña. Los owners usan `/auth/login` (email + password).

---

## requireOtp removido de stamp cards — 2026-03-27

**Contexto:** El campo `requireOtp` existía en el schema de `stamp_cards` y en los DTOs como feature premium futura.

**Decisión:** Removido de `CreateStampCardDto`, `UpdateStampCardDto` y de la lógica del service. El campo en DB (`require_otp boolean default false`) se deja intacto.

**Por qué:** OTP no está disponible (pendiente Infobip). No tiene sentido exponer una feature que no funciona. Se re-implementa cuando Infobip esté operativo.

---

## Plan único "Emprendedor" — un negocio = una suscripción — 2026-03-26

**Contexto:** Definición del modelo comercial para MVP.

**Decisión:** Un único plan: "Emprendedor" MX$299/mes. Sin free tier. Cada negocio requiere su propia suscripción. No hay bundling de múltiples negocios en un solo plan.

**Por qué:** Simplifica la lógica de billing. El freemium agrega complejidad de feature flags y límites que no son prioritarios para MVP. Si un owner tiene 2 negocios, paga 2 suscripciones — son entidades de facturación independientes.
