# patterns.md

Patrones de código recurrentes en Repitt API.

**Formato:**
```
## [Nombre del patrón]
**Dónde se usa:** archivos o contextos
**Ejemplo:** snippet de código
```

---

## Inyección del cliente Drizzle

**Dónde se usa:** Todos los servicios que acceden a la DB (`auth.service.ts`, `users.service.ts`, `businesses.service.ts`, `visits.service.ts`, etc.)

**Ejemplo:**
```typescript
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class MyService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
  ) {}
}
```

---

## Query Drizzle con join y aggregate

**Dónde se usa:** `users.service.ts` (findMe), `businesses.service.ts` (findMyBusinesses)

**Ejemplo:**
```typescript
const result = await this.db
  .select({
    id: users.id,
    name: users.firstName,
    visitsCount: sql<number>`CAST(COUNT(${visits.id}) AS INT)`,
    accountStatus: { name: accountStatuses.name },
  })
  .from(users)
  .leftJoin(accountStatuses, eq(users.accountStatusId, accountStatuses.id))
  .leftJoin(visits, eq(visits.userId, users.id))
  .where(eq(users.id, userId))
  .groupBy(users.id, accountStatuses.id)
  .limit(1);
```

---

## Transacción Drizzle

**Dónde se usa:** `auth.service.ts` (register), `visits.service.ts` (scanUser)

**Ejemplo:**
```typescript
return await this.db.transaction(async (tx) => {
  const [newUser] = await tx.insert(users).values({ ... }).returning();
  const [newBusiness] = await tx.insert(businesses).values({
    userId: newUser.id,
    ...
  }).returning();
  return { user: newUser, business: newBusiness };
});
```

---

## DTO con class-validator y Swagger

**Dónde se usa:** Todos los DTOs en `*/dto/*.dto.ts`

**Ejemplo:**
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'juan@email.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+5491123456789' })
  @IsString()
  @IsOptional()
  phone?: string;
}
```

---

## Endpoint protegido con JWT

**Dónde se usa:** Cualquier endpoint que requiere autenticación

**Ejemplo:**
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get authenticated user profile' })
getMe(@Request() req) {
  return this.usersService.findMe(req.user.id, req.user.role);
}
```

El objeto `req.user` contiene `{ id, email, role }` según `JwtStrategy.validate()`.

---

## Upload de archivo multipart

**Dónde se usa:** `businesses.controller.ts` (logo upload)

**Ejemplo:**
```typescript
@Post(':id/logo')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('logo'))
@ApiConsumes('multipart/form-data')
uploadLogo(
  @Param('id') id: string,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
        new FileTypeValidator({ fileType: /jpeg|jpg|png|gif|webp/ }),
      ],
    }),
  )
  file: Express.Multer.File,
  @Request() req,
) {
  return this.businessesService.uploadLogo(req.user.id, +id, file);
}
```

---

## Upload a Supabase Storage

**Dónde se usa:** `supabase.service.ts`, llamado desde `auth.service.ts`, `businesses.service.ts`, `flyer.service.ts`

**Ejemplo:**
```typescript
// Subir archivo (multipart)
const url = await this.supabaseService.uploadImage(file, `business-logos/${businessId}.jpg`);

// Subir buffer (QR generado en memoria)
const qrBuffer = await QRCode.toBuffer(data, { type: 'png', width: 1000 });
const url = await this.supabaseService.uploadBuffer(qrBuffer, 'image/png', `qr-users/${userId}.png`);
```

---

## Generación de RepittCode

**Dónde se usa:** `auth.service.ts` durante registro de usuario y negocio

**Ejemplo:**
```typescript
import { CodeGeneratorUtil } from '../common/utils/code-generator.util';

const codeGenerator = new CodeGeneratorUtil();
const repittCode = codeGenerator.generateRepittCode(); // → "abc-def-ghi"
```

Formato: 9 letras minúsculas aleatorias en 3 grupos de 3, separados por guiones.

---

## Rutas anidadas (recursos hijo)

**Dónde se usa:** `stamp-cards.controller.ts` — stamp cards como sub-recurso de businesses

**Ejemplo:**
```typescript
@Controller('businesses/:businessId/stamp-cards')
export class StampCardsController {
  @Get()
  getAll(@Param('businessId', ParseIntPipe) businessId: number) { ... }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(@Param('businessId', ParseIntPipe) businessId: number, @Request() req: any) { ... }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Param('businessId', ParseIntPipe) businessId: number, @Body() dto: CreateDto, @Request() req: any) { ... }
}
```

El `businessId` viene de la URL — no incluirlo en el DTO del POST. Usar siempre `ParseIntPipe` para parámetros numéricos de ruta.

---

## Sub-queries de métricas en paralelo con Promise.all

**Dónde se usa:** `metrics.service.ts` — `getMetrics()`

**Ejemplo:**
```typescript
const [totalVisits, newCustomers, activeUsers, redeemedRewards, completedStampCards, visitsByMonth] =
  await Promise.all([
    this.getTotalVisitsMetric(businessId, current, previous),
    this.getNewCustomersMetric(businessId, current, previous),
    this.getActiveUsersMetric(businessId),
    this.getRedeemedRewardsMetric(businessId, current, previous),
    this.getCompletedStampCardsMetric(businessId, current, previous),
    this.getVisitsByMonth(businessId),
  ]);
return { totalVisits, newCustomers, activeUsers, redeemedRewards, completedStampCards, visitsByMonth };
```

Cada sub-métrica es una query independiente. `Promise.all` las ejecuta en paralelo — no encadenarlas secuencialmente.

---

## Relleno de resultados dispersos de DB a array completo (12 meses)

**Dónde se usa:** `metrics.service.ts` — `getVisitsByMonth()`

**Ejemplo:**
```typescript
const rows = await this.db.select({
    month: sql<number>`CAST(EXTRACT(MONTH FROM ${visits.createdAt}) AS INT)`,
    visitsCount: sql<number>`CAST(COUNT(*) AS INT)`,
  })
  .from(visits)
  // ... joins y where
  .groupBy(sql`EXTRACT(MONTH FROM ${visits.createdAt})`)
  .orderBy(sql`EXTRACT(MONTH FROM ${visits.createdAt})`);

const map = new Map(rows.map((r) => [r.month, r.visitsCount]));
return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, visitsCount: map.get(i + 1) ?? 0 }));
```

Patrón: construir un `Map` con los resultados de DB, luego generar el array completo (N elementos) usando `map.get(key) ?? 0` para los faltantes.

---

## Acción como sub-ruta POST (patrón action endpoint)

**Dónde se usa:** `businesses.controller.ts` — `redeem`

**Ejemplo:**
```typescript
@Post(':userStampCardId/redeem')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
redeemReward(
  @Param('businessId', ParseIntPipe) businessId: number,
  @Param('userStampCardId', ParseIntPipe) userStampCardId: number,
  @Request() req: any,
) {
  return this.businessesService.redeemReward(req.user.id, businessId, userStampCardId);
}
```

Usar `POST /:resource/:id/:action` cuando la operación tiene lógica de negocio propia (validaciones de estado, efectos secundarios) y no es un CRUD genérico. Sin body — toda la información viene de la URL y el JWT.

---

## Verificación de ownership antes de mutación

**Dónde se usa:** `businesses.service.ts` (update, uploadLogo)

**Ejemplo:**
```typescript
const business = await this.db
  .select()
  .from(businesses)
  .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)))
  .limit(1);

if (business.length === 0) {
  throw new NotFoundException('Business not found or access denied');
}
```

Combinar el ID del recurso con el userId del token en el WHERE — nunca confiar solo en el ID del recurso.

---

## Crear o recuperar Stripe Customer por negocio (upsert)

**Dónde se usa:** `billing.service.ts` — `createCheckoutSession()`, `createPortalSession()`

**Ejemplo:**
```typescript
let stripeCustomerId = business.stripeCustomerId;

if (!stripeCustomerId) {
  const customer = await this.stripe.customers.create({
    name: business.name,
    metadata: { businessId: String(businessId) },
  });
  stripeCustomerId = customer.id;
  await this.db
    .update(businesses)
    .set({ stripeCustomerId })
    .where(eq(businesses.id, businessId));
}
```

Patrón: verificar si el negocio ya tiene `stripeCustomerId` antes de crear uno nuevo. Si existe, reutilizarlo. Si no, crear y persistir de inmediato antes de continuar.

---

## Leer período de suscripción desde el item (Stripe API 2026-03-25.dahlia)

**Dónde se usa:** `billing.service.ts` — al procesar webhooks y al consultar el estado de la sub

**Ejemplo:**
```typescript
const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
const item = sub.items.data[0];

const currentPeriodStart = (item as any).current_period_start as number;
const currentPeriodEnd = (item as any).current_period_end as number;
const cancelAt = sub.cancel_at; // Unix timestamp o null
```

En la API versión `2026-03-25.dahlia`, `current_period_start/end` están en el item, no en la sub raíz. El cast a `any` es necesario si los tipos del SDK no están actualizados. `cancel_at` (en la sub raíz) reemplaza a `cancel_at_period_end`.
