# AGENTS.md — Repitt API

Fuente de verdad compartida para todos los agentes de IA que trabajen en este proyecto.
Actualizar este archivo cuando cambien el stack, las convenciones o la arquitectura.

---

## 1. Descripción del proyecto

**Repitt** es un sistema de tarjetas de lealtad (stamp cards) para negocios físicos.

- **Usuarios visitantes** acumulan sellos en tarjetas de lealtad de negocios.
- **Usuarios dueños** crean negocios, configuran tarjetas de sellos y registran visitas escaneando el QR del visitante.
- Cada usuario y negocio tiene un **RepittCode** único (formato `abc-def-ghi`) y un QR asociado.
- Al registrar un negocio se genera automáticamente un **flyer** (plantilla + QR) listo para imprimir.

Contexto de negocio: producto en desarrollo activo, orientado a LATAM, con frontend en Vue.

---

## 2. Stack

| Tecnología | Versión | Rol |
|---|---|---|
| NestJS | ^11.0.1 | Framework principal |
| Node.js | >=20.0.0 | Runtime |
| TypeScript | ^5.7.3 | Lenguaje |
| PostgreSQL | — | Base de datos |
| Drizzle ORM | ^0.45.1 | Query builder type-safe |
| Drizzle Kit | ^0.31.9 | Migraciones de schema |
| postgres.js | ^3.4.8 | Driver de conexión |
| Passport.js + JWT | ^11.0.5 / ^11.0.2 | Autenticación |
| bcrypt | ^6.0.0 | Hash de contraseñas |
| Supabase JS | ^2.99.2 | Storage de archivos (QRs, logos, flyers) |
| Sharp | ^0.34.5 | Procesamiento de imágenes (flyers) |
| QRCode | ^1.5.4 | Generación de QR codes |
| class-validator | ^0.14.4 | Validación de DTOs |
| class-transformer | ^0.5.1 | Transformación de DTOs |
| @nestjs/swagger | ^11.2.6 | Documentación OpenAPI |
| @nestjs/config | ^4.0.3 | Variables de entorno |
| Jest | ^30.0.0 | Testing |

---

## 3. Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo con hot-reload
npm run start:dev

# Build de producción
npm run build

# Producción
npm run start:prod

# Seed inicial (account statuses + categorías)
npm run seed

# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Cobertura
npm run test:cov

# Migraciones
npx drizzle-kit generate   # Genera SQL de migración
npx drizzle-kit migrate    # Aplica migraciones
npx drizzle-kit studio     # UI para explorar DB
```

Swagger disponible en: `http://localhost:3000/api/docs`

---

## 4. Arquitectura

### Estructura general

```
src/
├── main.ts                  # Bootstrap: CORS, ValidationPipe global, Swagger, listen
├── app.module.ts            # Módulo raíz — importa todos los feature modules
├── auth/                    # Autenticación y onboarding
├── users/                   # Perfil de usuario + historial personal de visitas
├── businesses/              # Gestión de negocios, user-stamp-cards, redención de recompensas
├── stamp-cards/             # Tarjetas de lealtad + visitas por stamp card
├── visits/                  # Registro de visitas/escaneos + historial global del negocio
├── metrics/                 # Métricas de negocio (solo owner)
├── catalogs/                # Datos estáticos (categorías, account statuses)
├── database/                # Módulo global de DB (Drizzle + postgres.js)
├── supabase/                # Módulo global de storage (Supabase)
├── flyer/                   # Generación de flyers con Sharp
├── common/utils/            # Utilidades compartidas (RepittCode generator)
└── assets/templates/        # flyer.jpg — plantilla para flyers
```

### Patrones clave

- **Módulos NestJS**: cada feature es un módulo independiente con su controller, service y DTOs.
- **DatabaseModule**: módulo global que provee el cliente Drizzle mediante token de inyección `DATABASE_CONNECTION`.
- **SupabaseModule**: módulo global para uploads de archivos.
- **JwtAuthGuard**: guard reutilizable para proteger endpoints.
- **Soft delete**: todos los schemas tienen columna `deletedAt` (los registros nunca se borran).
- **Transacciones Drizzle**: operaciones multi-tabla se envuelven en `db.transaction()`.

### Flujo de datos principal

```
Request → Controller (decorators + guard) → Service (lógica + DB) → Response
                                                     ↕
                                             Drizzle ORM → PostgreSQL
                                                     ↕
                                          SupabaseService → Supabase Storage
```

### Roles de usuario

- `Owner`: dueño de negocio — puede registrar visitas, gestionar negocios.
- `Visitor`: cliente — acumula sellos en tarjetas de lealtad.

El rol se determina en registro/login y se incluye en el JWT payload.

---

## 5. Convenciones de código

### Archivos y carpetas
- Módulos: `feature/feature.module.ts`, `feature/feature.service.ts`, `feature/feature.controller.ts`
- DTOs: `feature/dto/action-feature.dto.ts`
- Schemas: `database/schema/table_name.schema.ts` (snake_case para nombre de archivo)
- Todo en inglés excepto comentarios/mensajes de error que pueden ser en español

### DTOs
- Siempre usar `class-validator` decorators en cada campo
- Siempre incluir `@ApiProperty()` / `@ApiPropertyOptional()` para Swagger
- Usar `@IsOptional()` + tipo opcional TS para campos opcionales
- El `ValidationPipe` global tiene `whitelist: true, transform: true`

### Servicios
- Inyectar DB con `@Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase`
- Otros servicios se inyectan por tipo sin `@Inject`
- Todos los miembros inyectados son `private readonly`

### Queries Drizzle
- No usar raw SQL string excepto para aggregates con `sql<type>``
- Joins explícitos con `leftJoin(table, eq(a.col, b.col))`
- Siempre `.limit(1)` en queries que esperan un único resultado
- Usar `.returning()` tras `.insert()` o `.update()` para obtener el registro

### Controladores
- Prefijo de ruta en `@Controller('path')`
- `@ApiTags('ModuleName')` para agrupar en Swagger
- `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()` para endpoints protegidos
- `@HttpCode(HttpStatus.OK)` cuando el método no es GET y el código no es 201

### Errores
- Usar excepciones NestJS: `UnauthorizedException`, `NotFoundException`, `BadRequestException`, `ForbiddenException`
- Nunca retornar null/undefined donde se espera un objeto — lanzar excepción

### Tests
- Archivos: `feature.spec.ts` junto al archivo que testea
- E2E: en `test/`

---

## 6. Variables de entorno

Copiar `.env.example` como `.env` para desarrollo local.

| Variable | Descripción | Requerida |
|---|---|---|
| `PORT` | Puerto del servidor (default: 3000) | No |
| `DATABASE_URL` | Connection string PostgreSQL | Sí |
| `JWT_SECRET` | Secreto para firmar JWT | Sí |
| `SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `SUPABASE_KEY` | Service key de Supabase | Sí |
| `SYSTEM_BUCKET_NAME` | Bucket de Supabase (default: `businesses-media`) | No |
| `SITE_URL` | URL base del frontend (default: `https://repitt.com`) | No |

**Nunca commitear `.env` con valores reales.** El `.env.example` muestra las claves sin valores.

---

## 7. Estructura de módulos

### `auth/`
Registro de usuarios (onboarding), login, logout, password recovery. El registro de negocio también pasa por aquí.

Endpoints:
- `POST /auth/onboarding` — Owner onboarding — firstName, lastName, email, password, phone (required) + optional business
- `POST /auth/login` — Login de owner (email + password), retorna JWT
- `POST /auth/logout` — Logout (requiere JWT)
- `POST /auth/visitor/register` — Visitor registration — firstName + lastName + phone (lastName requerido), no password, JWT inmediato
- `POST /auth/visitor/login` — Visitor login — phone → JWT inmediato (sin OTP hasta tener Infobip; OTP es feature futura desacoplada del MVP)
- `POST /auth/forgot-password` — Solicita reset de contraseña, envía email via Brevo (solo owners)
- `POST /auth/reset-password` — Resetea contraseña con token (solo owners)

**Auth MVP decisions (2026-03-25):**
- Login de visitante es phone → JWT inmediato para MVP. OTP se implementará cuando Infobip esté disponible.
- OTP removido del trigger "primer canje" — timing incómodo. OTP futuro será flujo desacoplado.
- `lastName` en visitor registration pasó a ser requerido (CRM mínimo viable).
- Password recovery solo para owners (visitantes no tienen contraseña).
- WhatsApp provider elegido: Infobip. Pendiente número WA.

El registro con negocio es una transacción que crea: usuario → QR usuario → negocio → QR negocio → flyer → stamp card por defecto.

### `users/`
Perfil del usuario autenticado e historial personal de visitas.

Endpoints:
- `GET /users/me` — Perfil completo + total de visitas
- `PATCH /users/me` — Editar perfil (firstName, lastName, phone)
- `GET /users/me/visits` — Historial personal de visitas (visitor, JWT requerido)
- `GET /users/me/stamp-cards` — Mis stamp cards activas como visitante
- `GET /users/me/stamp-cards/:userStampCardId` — Detalle de una stamp card del visitante

### `businesses/`
Gestión de negocios del dueño, user-stamp-cards de clientes, redención de recompensas y CRM.

Endpoints:
- `POST /businesses` — Crear negocio para owner ya autenticado (no crea stamp card default)
- `GET /businesses/me` — Mis negocios (requiere JWT)
- `GET /businesses/:repittCode` — Perfil público de negocio
- `PATCH /businesses/:businessId` — Actualizar negocio (requiere JWT, verifica ownership)
- `POST /businesses/:businessId/logo` — Subir logo (multipart, max 2MB, jpg/png/gif/webp)
- `GET /businesses/:businessId/visits` — Historial global de visitas del negocio (owner)
- `GET /businesses/:businessId/user-stamp-cards/pending-redeem` — Tarjetas completadas pendientes de canje (owner)
- `POST /businesses/:businessId/user-stamp-cards/:userStampCardId/redeem` — Canjear recompensa (owner, sin body)
- `GET /businesses/:businessId/user-stamp-cards/:userStampCardId` — Detalle de tarjeta de un cliente (owner)

**CRM endpoints (owner):**
- `GET /businesses/:businessId/customers` — Listado de clientes. Devuelve `{ totalCustomers, data: [...] }`. Cada item: id, firstName, lastName, phone, totalVisits, lastVisitAt, joinedAt, stampCards activos del negocio.
- `GET /businesses/:businessId/customers/:customerId` — Detalle de cliente. Devuelve stats + historial completo de ciclos por stamp card.

### `stamp-cards/`
Configuración de tarjetas de lealtad de un negocio y visitas por tarjeta.

Endpoints:
- `GET /businesses/:businessId/stamp-cards` — Listado público de stamp cards del negocio
- `GET /businesses/:businessId/stamp-cards/me` — Mis stamp cards como owner (JWT)
- `POST /businesses/:businessId/stamp-cards` — Crear stamp card (owner)
- `GET /businesses/:businessId/stamp-cards/:stampCardId` — Detalle de stamp card
- `GET /businesses/:businessId/stamp-cards/:stampCardId/visits` — Todas las visitas de esa stamp card (owner)

### `metrics/`
Métricas del negocio para el owner autenticado. Solo accesible por el dueño del negocio.

Endpoints:
- `GET /businesses/:businessId/metrics?timePeriod=` — Métricas del negocio (owner). `timePeriod`: `week` | `month` (default) | `year`

Métricas incluidas: `totalVisits`, `newCustomers`, `activeUsers`, `redeemedRewards`, `completedStampCards`, `visitsByMonth`.

### `visits/`
Registro de visitas cuando el dueño escanea el QR de un visitante. Aplica cooldown entre sellos.

Endpoints:
- `GET /visits` — Alias interno (ver `GET /businesses/:businessId/visits`)
- `POST /businesses/:businessId/visits/scan` — Registrar visita. Acepta 3 modalidades:
  1. `{ userStampCardRepittCode }` — QR directo de la tarjeta del visitante (12 dígitos)
  2. `{ userRepittCode, stampCardId }` — QR de usuario + selección de stamp card
  3. `{ phone, stampCardId }` — búsqueda por teléfono (tablet sin cámara / registro manual)
- `POST /businesses/:businessId/visits/register-customer` — Registra cliente nuevo + primera visita en una transacción. Body: `{ firstName, lastName, phone, stampCardId }`. **Upsert por teléfono**: si el teléfono ya existe, usa el usuario existente en lugar de crear uno nuevo. Devuelve `{ isNew: boolean, data: { userStampCard, visit } }`.

### `catalogs/`
Datos estáticos: categorías de negocio y account statuses.

Endpoints:
- `GET /catalogs/categories` — Lista de categorías activas

### `database/`
Módulo global. Expone cliente Drizzle via token `DATABASE_CONNECTION`. No agregar lógica de negocio aquí.

### `supabase/`
Módulo global. Expone `uploadImage(file, path)` y `uploadBuffer(buffer, mimetype, path)`.

### `flyer/`
Genera flyers compositeando el QR del negocio sobre `src/assets/templates/flyer.jpg` usando Sharp.

### `common/utils/`
- `code-generator.util.ts` — Genera RepittCodes en formato `abc-def-ghi`

---

## 8. Testing y deploy

### Testing
```bash
npm run test          # Unitarios
npm run test:e2e      # E2E
npm run test:cov      # Cobertura
```

Tests unitarios: `*.spec.ts` junto al módulo.
Tests e2e: `test/app.e2e-spec.ts`.

### Deploy
- Build: `npm run build` genera `dist/`
- Producción: `npm run start:prod` ejecuta `dist/main.js`
- La app escucha en `0.0.0.0:PORT` (necesario para containers)
- Seed obligatorio en primer deploy: `npm run seed`

### Migraciones
```bash
npx drizzle-kit generate   # Crear archivo de migración
npx drizzle-kit migrate    # Aplicar a la DB
```
Los archivos de migración van en `drizzle/`.

---

## 9. Freemium y billing (diseño, pendiente implementación)

### Planes
- `free`: 1 negocio, 1 stamp card, sin OTP en canje
- `premium`: negocios y stamp cards ilimitados, OTP en canje disponible

### `users.plan`
Campo denormalizado en la tabla `users` (`'free' | 'premium'`). Actualizado por el webhook handler de billing. Permite verificar permisos sin joins adicionales.

### PLAN_LIMITS
Definido en `src/common/constants/plans.ts`. Fuente de verdad de límites por plan en código. Guards verifican `user.plan` contra `PLAN_LIMITS` antes de crear recursos.

### Schema de billing (pendiente de migración)
Tablas diseñadas pero **NO migradas** aún:
- `subscriptions` — con `provider` + `providerSubId` (naming agnóstico, no específico de Stripe)
- `subscription_items`
- `billing_webhook_events`

Campos pendientes en `users`: `billingProvider`, `billingCustomerId`, `pmType`, `pmLastFour`, `trialEndsAt`.

**No implementar Stripe module antes de aplicar estas migraciones.**

Ver memoria `project_billing_schema.md` para detalle completo.

---

## 10. Memoria dinámica

Decisiones, patrones, gotchas y notas de API se documentan en `docs/agents/`:

| Archivo | Contenido |
|---|---|
| [decisions.md](docs/agents/decisions.md) | Decisiones de arquitectura con contexto y razón |
| [patterns.md](docs/agents/patterns.md) | Patrones de código recurrentes con ejemplos |
| [gotchas.md](docs/agents/gotchas.md) | Cosas no obvias que pueden causar errores |
| [api-notes.md](docs/agents/api-notes.md) | Comportamientos no obvios del backend y APIs externas |

**Regla:** Si descubres algo no obvio → documéntalo en el archivo correspondiente antes de terminar la conversación.
