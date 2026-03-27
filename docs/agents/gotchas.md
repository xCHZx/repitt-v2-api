# gotchas.md

Cosas que parecen simples pero tienen trampa en Repitt API.

**Formato:**
```
## [Título] — YYYY-MM-DD
**Problema:** qué pasa si no se tiene en cuenta
**Solución:** cómo manejarlo correctamente
```

---

## Soft delete no se filtra automáticamente — 2026-03-18

**Problema:** Todas las tablas tienen `deletedAt` pero Drizzle no aplica filtros automáticos. Si no se agrega `.where(isNull(table.deletedAt))` en los queries, se retornan registros "eliminados".

**Solución:** Agregar siempre `isNull(table.deletedAt)` en el WHERE de queries de lectura. Ejemplo:
```typescript
.where(and(eq(users.id, id), isNull(users.deletedAt)))
```

---

## JWT_SECRET tiene fallback inseguro — 2026-03-18

**Problema:** Si `JWT_SECRET` no está definido en `.env`, el sistema usa `'super-secret-key-change-in-production'`. No hay error ni warning. Tokens firmados con ese secreto son predecibles.

**Solución:** En producción, siempre definir `JWT_SECRET` como variable de entorno con un valor fuerte. Agregar validación al inicio si se quiere fallar rápido.

---

## El tipo de `db` en servicios no está tipado con el schema — 2026-03-18

**Problema:** Los servicios declaran `PostgresJsDatabase<Record<string, unknown>>` en lugar de `PostgresJsDatabase<typeof schema>`. Esto reduce el type-checking de Drizzle — no hay autocompletado de tablas al hacer `db.select().from(...)`.

**Solución actual:** Importar las tablas del schema explícitamente y referenciarlas directamente. No bloquea funcionalidad, pero limita el tipado. Para mejorar: cambiar el tipo a `PostgresJsDatabase<typeof schema>` e importar el schema completo desde `database/schema/index.ts`.

---

## El endpoint de onboarding es lento por diseño — 2026-03-18

**Problema:** `POST /auth/onboarding` con negocio hace múltiples operaciones IO síncronas: genera QR (CPU), sube QR a Supabase, genera flyer con Sharp (CPU), sube flyer a Supabase — todo en secuencia dentro de la misma request.

**Solución:** Es comportamiento esperado actualmente. No agregar timeouts cortos en proxies/load balancers para este endpoint. A futuro considerar background jobs para la generación de assets.

---

## repittCode debe ser único — verificar antes de insertar — 2026-03-18

**Problema:** `generateRepittCode()` es aleatorio. Aunque la probabilidad de colisión es baja, la DB tiene constraint UNIQUE en `repittCode`. Si hay colisión, el insert lanza error de constraint sin manejo específico.

**Solución:** El código actual no reintenta en caso de colisión. Si el volumen de usuarios crece, agregar lógica de retry: generar código, verificar existencia, si existe generar otro.

---

## FileTypeValidator de NestJS no detecta SVG — 2026-03-18

**Problema:** NestJS v10+ usa la librería `file-type` que detecta tipos de archivo por magic bytes del buffer. SVG es XML puro (texto), no tiene magic bytes — `file-type` retorna `undefined` y la validación falla aunque el mimetype sea correcto.

**Solución:** No usar `addFileTypeValidator()` de `ParseFilePipeBuilder` cuando SVG está entre los tipos permitidos. Validar manualmente el `file.mimetype` en el controller con un array de tipos permitidos y lanzar `BadRequestException` si no está incluido.

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
if (!ALLOWED_TYPES.includes(file.mimetype)) {
  throw new BadRequestException('File type not allowed');
}
```

---

## Rutas estáticas deben declararse antes que dinámicas — 2026-03-18

**Problema:** En NestJS con Express, las rutas se evalúan en orden de declaración. Si `GET /:stampCardId` se declara antes que `GET /me`, Express captura `"me"` como valor del parámetro dinámico y lanza `Validation failed (numeric string is expected)` al aplicar `ParseIntPipe`.

**Solución:** Declarar siempre rutas estáticas (`/me`, `/active`, etc.) antes que las dinámicas (`/:id`, `/:stampCardId`) dentro del mismo controller.

---

## repittCode en sub-recursos causa conflicto de routing — 2026-03-18

**Problema:** Si se usa `:repittCode` y `:businessId` en la misma posición de URL con el mismo método HTTP, Express no los distingue — son el mismo patrón wildcard. El primer controller registrado gana siempre.

**Solución:** El repittCode se usa solo en el recurso raíz (`GET /businesses/:repittCode`). Sub-recursos anidados usan el ID numérico para evitar el conflicto. Ver decisions.md para el contexto completo.

---

## Drizzle .returning() retorna array, no objeto — 2026-03-18

**Problema:** Tras un `.insert().values().returning()`, Drizzle retorna un array aunque se inserte un solo registro. Si no se desestructura, el resultado es `[{ id: 1, ... }]` y el acceso a propiedades retorna `undefined`.

**Solución:** Siempre desestructurar:
```typescript
const [newUser] = await tx.insert(users).values({ ... }).returning();
// newUser.id ✓
// NO: const result = await ...; result.id ✗ (es array)
```

---

## categoryId requerido para crear negocio — 2026-03-18

**Problema:** El schema de `businesses` tiene `categoryId` como NOT NULL con FK a `categories`. Si el frontend no envía `categoryId` al registrar un negocio, el insert falla en DB.

**Solución:** El `RegisterDto` tiene `categoryId` como opcional en TypeScript pero es requerido en DB cuando `businessName` está presente. Agregar validación condicional en el servicio o en el DTO.

---

## Conflicto de migración al agregar columna ya existente — 2026-03-21

**Problema:** Si se corre `drizzle-kit generate` + `migrate` sobre una DB que ya tiene la columna (por ejemplo `repitt_code` en `businesses`), la migración falla con `column already exists`. Esto ocurre cuando la DB y el directorio `drizzle/` están desfasados (ej: migraciones aplicadas manualmente o estado inconsistente).

**Solución:** Migración fresca. En Supabase:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
DROP SCHEMA drizzle CASCADE;
```
Luego localmente:
```bash
rm -rf drizzle/
npx drizzle-kit generate
npx drizzle-kit migrate
npm run seed   # obligatorio — recrea account_statuses y categories
```
⚠️ Esto borra todos los datos. Solo hacer en dev/staging, nunca en prod.

---

## Los módulos Supabase y Database son globales — no reimportar — 2026-03-18

**Problema:** `DatabaseModule` y `SupabaseModule` están marcados con `@Global()`. Si se importan en un feature module, NestJS puede lanzar advertencias o comportamientos inesperados.

**Solución:** No importar `DatabaseModule` ni `SupabaseModule` en los feature modules. El cliente de DB y Supabase están disponibles para inyección en cualquier servicio sin importar explícitamente el módulo.

---

## Stripe API 2026-03-25.dahlia — breaking changes en el schema de subscription — 2026-03-26

**Problema:** La versión `2026-03-25.dahlia` de la Stripe API introduce dos breaking changes respecto a versiones anteriores:
1. `cancel_at_period_end: true` ya no es el mecanismo de cancelación — fue reemplazado por `cancel_at: timestamp` (Unix timestamp de cuándo cancela).
2. `current_period_start` y `current_period_end` se movieron del nivel raíz de la subscription al nivel del item: `sub.items.data[0].current_period_start`.

**Solución:**
- Para cancelar al fin del período: calcular el timestamp del fin de período actual y pasar `cancel_at: <timestamp>` en el update.
- Para leer fechas del período: usar `(item as any).current_period_start` y `(item as any).current_period_end` donde `item = sub.items.data[0]`. El cast a `any` es necesario porque los tipos del SDK de Stripe pueden no estar actualizados.
- El campo `subscriptions.endsAt` en DB almacena el valor de `cancel_at` de Stripe.

---

## findByEmail/findByPhone no cargan relaciones — no usarlas para derivar el rol — 2026-03-27

**Problema:** `usersService.findByEmail` y `findByPhone` hacen `select()` directo de la tabla `users` sin joins. Si se intenta leer `user.businesses` para determinar si es Owner, siempre devuelve `undefined` → el JWT siempre lleva `role: 'Visitor'`.

**Solución:** Para determinar el rol, hacer siempre una query separada a `businesses` filtrando por `userId` y `isNull(businesses.deletedAt)`. Ver `auth.service.ts` → `login()`.

---

## GET /users/me deriva el rol desde DB, no del JWT — 2026-03-27

**Problema:** El rol en el JWT es estático (se firma al momento del login). Si el usuario crea un negocio después de loguear, el JWT queda stale con `role: 'Visitor'`.

**Solución:** `UsersService.findMe` ignora el parámetro `role` del JWT y hace una query paralela a `businesses` para derivar el rol en runtime. `users.controller.ts` ya no pasa el rol al service.

---

## users.billingCustomerId está deprecado — no usar en flujo nuevo — 2026-03-26

**Problema:** El campo `users.billingCustomerId` existía en el schema original para vincular un Stripe Customer al usuario. El flujo nuevo vincula el customer al negocio (`businesses.stripeCustomerId`), no al usuario.

**Solución:** No usar `users.billingCustomerId` en ningún flujo nuevo de billing. El Stripe Customer se busca/crea siempre desde `businesses.stripeCustomerId`. El campo en users quedó como legacy y puede ignorarse.
