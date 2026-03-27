# api-notes.md

Comportamientos no obvios del backend y APIs externas integradas en Repitt API.

**Formato:**
```
## [Endpoint o módulo] — YYYY-MM-DD
**Comportamiento:** qué hace de forma no obvia
**Impacto:** cómo afecta al código
```

---

## POST /auth/onboarding — Rol determinado por presencia de businessName — 2026-03-18

**Comportamiento:** El rol del JWT retornado (`Owner` o `Visitor`) se determina en el momento del registro según si `businessName` fue enviado en el body. Si se envía `businessName`, el usuario es `Owner`; si no, es `Visitor`.

**Impacto:** El rol no se puede cambiar después del registro sin un flujo adicional. El frontend debe decidir en el onboarding si el usuario es dueño o visitante. No hay endpoint para cambiar de rol.

---

## PATCH /users/me — Requiere al menos un campo — 2026-03-21

**Comportamiento:** El endpoint valida que el body contenga al menos uno de los tres campos editables (`firstName`, `lastName`, `phone`). Si el body llega vacío o con campos no reconocidos (que el ValidationPipe con `whitelist: true` elimina), lanza `BadRequestException('At least one field must be provided')`.

**Impacto:** El frontend debe enviar solo los campos que cambien. No es necesario enviar todos. El campo `phone` acepta `null`/cadena vacía para borrarlo — solo hay que enviarlo si cambió.

---

## GET /users/me — Respuesta envuelta en { role, data } — 2026-03-18

**Comportamiento:** El endpoint no retorna el objeto de usuario directamente. La respuesta tiene la forma `{ role: 'Owner' | 'Visitor', data: { ...userFields } }`.

**Impacto:** El frontend debe acceder a `response.data` para los campos del usuario, no a `response` directamente. El `role` se incluye en el wrapper para que el frontend pueda determinar la vista sin decodificar el JWT.

---

## POST /visits/scan — Cooldown por horas, no por días — 2026-03-18

**Comportamiento:** El cooldown entre sellos se mide en horas (`requiredHours`). La stamp card por defecto tiene 24 horas. El sistema compara la fecha de la última visita con `Date.now()` en horas.

**Impacto:** Si un visitante ya tiene un sello del día anterior (menos de 24 horas), el endpoint lanza `BadRequestException` con el mensaje de cuántas horas faltan. El frontend debe manejar este error específicamente para mostrar feedback útil.

---

## Supabase Storage — uploadBuffer usa upsert — 2026-03-18

**Comportamiento:** `supabaseService.uploadBuffer()` usa `upsert: true`. Si ya existe un archivo en el mismo path, lo sobreescribe sin error.

**Impacto:** Re-generar el QR de un usuario o negocio con el mismo path sobreescribe el archivo anterior. No se acumulan versiones. El URL público sigue siendo el mismo (Supabase cached). Si la URL está cacheada en el browser, puede mostrar la versión anterior brevemente.

---

## Supabase Storage — uploadImage usa upsert — 2026-03-18

**Comportamiento:** Igual que `uploadBuffer`, `uploadImage()` usa `upsert: true`.

**Impacto:** Subir un nuevo logo con el mismo path reemplaza el anterior. Las URLs públicas de Supabase tienen caché CDN — el cambio puede no reflejarse inmediatamente en el cliente.

---

## FlyerService — QR posicionado con offset negativo — 2026-03-18

**Comportamiento:** El QR se posiciona en el flyer con un offset vertical de `-180px` desde el centro de la plantilla. La plantilla es de ~800x1035px. El QR se redimensiona a 550x550px antes de componer.

**Impacto:** Si se cambia el tamaño de la plantilla `src/assets/templates/flyer.jpg`, el posicionamiento del QR se desplaza. El offset está hardcodeado en `flyer.service.ts` — actualizar allí si se cambia la plantilla.

---

## GET /businesses/:repittCode — Endpoint público, sin JWT — 2026-03-18

**Comportamiento:** Este endpoint no requiere autenticación. Retorna el perfil público del negocio incluyendo stamp cards.

**Impacto:** No incluir información sensible del dueño (email, teléfono personal) en la respuesta de este endpoint. Actualmente retorna name, description, address, phone del negocio (no del usuario dueño).

---

## Drizzle — sql`` template tag requiere tipo explícito — 2026-03-18

**Comportamiento:** Al usar `sql<T>`` para expresiones SQL custom (aggregates, etc.), Drizzle no puede inferir el tipo. Hay que especificarlo explícitamente como generic.

**Impacto:** Sin el tipo, el campo retornado tiene tipo `unknown` en el resultado. Usar siempre:
```typescript
sql<number>`CAST(COUNT(${visits.id}) AS INT)`
// No: sql`COUNT(${visits.id})` (tipo unknown)
```

---

## GET /businesses/:businessId/metrics — Formato de respuesta y comportamiento de growth — 2026-03-21

**Comportamiento:**
- `timePeriod` acepta `week`, `month` (default), `year`. Cualquier valor no reconocido se trata como `month`.
- Cada métrica (excepto `activeUsers`) incluye `{ current, previous, growth }`. `growth` es `number | null` — es `null` cuando `previous = 0` (no hay base de comparación).
- `activeUsers` no tiene `growth` — es un snapshot acumulado (count de tarjetas activas no completadas) independiente del período.
- `visitsByMonth` siempre retorna exactamente 12 objetos `{ month: number, visitsCount: number }` donde `month` es 1-12. Los meses sin visitas tienen `visitsCount: 0`. El frontend es responsable de la localización del nombre del mes.

**Impacto:** El frontend no puede asumir que `growth` siempre es un número — debe manejar `null` (mostrar "N/A" o "—"). Para `visitsByMonth`, el frontend puede iterar el array directamente sin necesidad de rellenar huecos.

---

## POST /visits/scan — Dos flujos de escaneo — 2026-03-21

**Comportamiento:** El endpoint acepta dos combinaciones de campos:
1. `{ userRepittCode, stampCardId }` — el owner escanea el QR genérico del visitante y especifica la stamp card
2. `{ userStampCardRepittCode }` — el owner escanea el QR específico de la `userStampCard` (código de 12 dígitos, distinto al repittCode de usuario de 9 dígitos)

**Impacto:** El servicio detecta el flujo por qué campos llegaron. Si llega `userStampCardRepittCode`, busca la `userStampCard` por ese código e ignora `stampCardId`. El frontend debe enviar exactamente uno de los dos conjuntos — si se envían ambos, `userStampCardRepittCode` tiene prioridad.

---

## POST /businesses/:businessId/user-stamp-cards/:userStampCardId/redeem — Validaciones de estado — 2026-03-21

**Comportamiento:** Antes de canjear, el servicio verifica en orden:
1. El `businessId` pertenece al `userId` del JWT → `ForbiddenException` si no
2. La `userStampCard` existe y pertenece a una stamp card de ese negocio → `NotFoundException` si no
3. `isCompleted === true` → `BadRequestException('Stamp card is not completed yet')` si no
4. `isRewardRedeemed === false` → `BadRequestException('Reward already redeemed')` si ya fue canjeada

Retorna la `userStampCard` actualizada con `isRewardRedeemed: true` y `redeemedAt` seteado.

**Impacto:** El frontend debe manejar los 3 posibles error codes (403, 404, 400). El 400 tiene dos mensajes distintos — si el frontend necesita distinguirlos, comparar el mensaje de error.

---

## GET /businesses/:businessId/user-stamp-cards/:userStampCardId — Detalle con visitas — 2026-03-21

**Comportamiento:** Retorna el detalle de la tarjeta de un cliente incluyendo:
- Datos de la `stampCard` (nombre, ícono, `requiredStamps`, recompensa)
- Datos del cliente (`firstName`, `lastName`, `repittCode`)
- Datos del negocio (`name`, `logoPath`)
- Array `visits` — historial completo de visitas de esa tarjeta (no es `stamp_card.required_stamps`)

**Impacto:** `visits` en la respuesta son las visitas acumuladas del cliente en esa tarjeta, no el número de sellos requeridos. `stampCard.requiredStamps` es el umbral para completar la tarjeta.

---

## Convención de response shapes en businesses — 2026-03-21

**Comportamiento:** No hay interceptor global de respuesta. Cada endpoint devuelve raw lo que retorna el service. La convención para businesses es:
- Listas: `{ data: [...] }` — e.g. `GET /businesses/me`
- Recurso individual: `{ data: { ... } }` — e.g. `GET /businesses/:repittCode`, `PATCH /businesses/:businessId`, `POST /businesses/:businessId/logo`, `POST /businesses`
- `GET /users/me` es el único endpoint que usa `{ role, data }` en lugar de `{ data }`

**Impacto:** El frontend siempre accede a `response.data` para el payload. Para listas, `response.data` es array; para recursos individuales, es objeto. `PATCH` y `POST /logo` llaman a `findById` internamente, por lo que devuelven el shape completo del negocio con `stampCards[]` incluido.

---

## POST /visits/scan — Tres modalidades de escaneo — 2026-03-25

**Comportamiento:** El endpoint acepta tres combinaciones de campos:
1. `{ userStampCardRepittCode }` — QR específico de la tarjeta (12 dígitos)
2. `{ userRepittCode, stampCardId }` — QR genérico del usuario + stamp card seleccionada
3. `{ phone, stampCardId }` — búsqueda por número de teléfono (sin QR)

El servicio detecta el flujo por los campos presentes. Prioridad: `userStampCardRepittCode` > `userRepittCode+stampCardId` > `phone+stampCardId`.

**Impacto:** El frontend puede implementar un fallback: si no hay cámara disponible, mostrar campo de teléfono. La modalidad 3 es especialmente útil para tablets en mostrador o cuando el visitante no tiene la app.

---

## POST /businesses/:businessId/visits/register-customer — Upsert + isNew — 2026-03-25

**Comportamiento:** Crea usuario (si no existe) + userStampCard + visita en una única transacción. Si el `phone` ya existe en la DB, reutiliza el usuario existente sin crear un duplicado. Devuelve `{ isNew: boolean, data: { userStampCard, visit } }`.

**Impacto:** El frontend debe leer `isNew` para saber si fue un registro nuevo o un cliente recurrente. Si `isNew = false`, el usuario ya tenía cuenta — puede mostrar "Cliente recurrente registrado" en lugar de "Nuevo cliente creado". El endpoint no falla si el cliente ya existe; esto es intencional.

---

## GET /businesses/:businessId/customers — Shape de respuesta CRM — 2026-03-25

**Comportamiento:** Retorna `{ totalCustomers: number, data: [...] }`. Cada item del array incluye: `id`, `firstName`, `lastName`, `phone`, `totalVisits`, `lastVisitAt`, `joinedAt`, `stampCards` (array de stamp cards activas del negocio para ese cliente).

**Impacto:** `totalCustomers` es el count total (para paginación futura), independiente del largo de `data`. `lastVisitAt` puede ser `null` si el cliente fue registrado pero nunca tuvo una visita registrada.

---

## GET /businesses/:businessId/customers/:customerId — Detalle CRM con ciclos — 2026-03-25

**Comportamiento:** Retorna stats del cliente (totalVisits, totalRedeemed, joinedAt) + historial completo de ciclos por stamp card. Un "ciclo" es una instancia de `userStampCard` — si la stamp card permite `allowedRepeats`, el cliente puede tener múltiples ciclos de la misma stamp card.

**Impacto:** El historial de ciclos puede ser largo para clientes recurrentes. El frontend debe manejar el caso de múltiples ciclos de la misma stamp card mostrándolos en orden cronológico.

---

## Catalogs — Seed obligatorio antes del primer uso — 2026-03-18

**Comportamiento:** Las tablas `account_statuses` y `categories` deben estar populadas antes de que cualquier usuario pueda registrarse. El registro requiere `accountStatusId` (FK NOT NULL).

**Impacto:** En un ambiente nuevo (local, staging, prod), ejecutar `npm run seed` antes del primer request a `/auth/onboarding`. Si no se hace, el insert de usuario falla con FK constraint error.

---

## Módulo Billing — Endpoints de subscriptions por negocio — 2026-03-26

**Comportamiento:** Todos los endpoints de subscriptions operan sobre un `businessId`, no sobre el usuario autenticado directamente.

- `POST /subscriptions/checkout { businessId }` — crea (o recupera) un Stripe Customer para ese negocio, genera una Checkout Session de Stripe y retorna la URL.
- `GET /subscriptions/business/:businessId` — retorna el estado actual de la suscripción de ese negocio.
- `POST /subscriptions/portal { businessId }` — genera y retorna la URL del Customer Portal de Stripe para ese negocio.
- `POST /subscriptions/cancel { businessId }` — cancela la suscripción activa de ese negocio al fin del período actual.
- `GET /subscriptions/me` — ELIMINADO, ya no existe.

**Impacto:** El frontend nunca debe asumir que hay una suscripción global por usuario. Para mostrar el estado de billing de un negocio, llamar a `GET /subscriptions/business/:businessId`. El flujo de checkout requiere tener el `businessId` disponible antes de iniciar el pago.

---

## GET /users/me — Campo subscription eliminado — 2026-03-26

**Comportamiento:** La respuesta de `GET /users/me` ya no incluye un objeto `subscription`. Solo incluye `plan: 'free' | 'premium'` como campo denormalizado de cache.

**Impacto:** El frontend no puede obtener detalles de suscripción desde `/users/me`. Para detalles de la sub (fechas, estado, `endsAt`), usar `GET /subscriptions/business/:businessId`. El campo `plan` en el usuario es solo un indicador rápido que puede estar desfasado unos segundos respecto al webhook.

---

## Webhook de Stripe — Flujo de activación de negocio — 2026-03-26

**Comportamiento:** El módulo de billing expone un endpoint de webhook que maneja al menos dos eventos:
1. `checkout.session.completed` → `businesses.isActive = true` para el negocio asociado.
2. `customer.subscription.deleted` → `businesses.isActive = false` para el negocio asociado.

El negocio nace con `isActive = false` (default en DB). El checkout crea el Stripe Customer y lo guarda en `businesses.stripeCustomerId`. La activación real ocurre solo vía webhook.

**Impacto:** No confiar en que el negocio está activo inmediatamente después del checkout. La activación depende de que el webhook de Stripe sea procesado. En desarrollo, usar Stripe CLI (`stripe listen --forward-to ...`) para recibir webhooks localmente. El endpoint de webhook debe estar excluido de la validación JWT.
