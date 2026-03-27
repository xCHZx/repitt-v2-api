import { Inject, Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { businesses, users, stampCards, userStampCards, visits, accountStatuses } from '../database/schema';
import { generateRepittCode } from '../common/utils/code-generator.util';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class VisitsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getBusinessVisits(ownerId: number, businessId: number) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
      .limit(1);
    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    const rows = await this.db
      .select({
        id: visits.id,
        createdAt: visits.createdAt,
        userStampCardId: visits.userStampCardId,
        stampCard: {
          id: stampCards.id,
          name: stampCards.name,
        },
        customer: {
          firstName: users.firstName,
          lastName: users.lastName,
          repittCode: users.repittCode,
        },
      })
      .from(visits)
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .innerJoin(users, eq(users.id, visits.userId))
      .orderBy(desc(visits.createdAt));

    return {
      totalVisits: rows.length,
      visits: rows,
    };
  }

  async registerCustomer(ownerId: number, businessId: number, dto: { firstName: string; lastName: string; phone: string; stampCardId: number }) {
    return await this.db.transaction(async (tx) => {
      // 1. Verify business ownership
      const [business] = await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
        .limit(1);
      if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

      // 2. Find or create customer by phone (upsert)
      let [customer] = await tx.select().from(users).where(eq(users.phone, dto.phone)).limit(1);
      const isNew = !customer;

      if (!customer) {
        let defaultStatus = await tx.select().from(accountStatuses).where(eq(accountStatuses.id, 1)).limit(1);
        if (defaultStatus.length === 0) {
          defaultStatus = await tx.insert(accountStatuses).values({ name: 'Active' }).returning();
        }

        const repittCode = generateRepittCode();
        const qrBuffer = await QRCode.toBuffer(repittCode, {
          type: 'png', margin: 1, width: 1000,
          color: { dark: '#000000ff', light: '#ffffffff' },
        });
        const qrPath = await this.supabaseService.uploadBuffer(
          qrBuffer, 'image/png', `qr-users/usr-${repittCode}`,
        );

        [customer] = await tx.insert(users).values({
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          repittCode,
          qrPath,
          accountStatusId: defaultStatus[0].id,
        }).returning();
      }

      // 3. Find stamp card (must belong to this business)
      const [stampCard] = await tx
        .select()
        .from(stampCards)
        .where(and(eq(stampCards.id, dto.stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
        .limit(1);
      if (!stampCard) throw new NotFoundException('Tarjeta de sellos no encontrada');

      // 4. Find active cycle or create first one
      let [progress] = await tx
        .select()
        .from(userStampCards)
        .where(and(eq(userStampCards.userId, customer.id), eq(userStampCards.stampCardId, stampCard.id), eq(userStampCards.isRewardRedeemed, false)))
        .orderBy(desc(userStampCards.createdAt))
        .limit(1);

      if (!progress) {
        if (stampCard.allowedRepeats !== null) {
          const [{ redeemedCount }] = await tx
            .select({ redeemedCount: sql<number>`CAST(COUNT(*) AS INT)` })
            .from(userStampCards)
            .where(and(eq(userStampCards.userId, customer.id), eq(userStampCards.stampCardId, stampCard.id), eq(userStampCards.isRewardRedeemed, true)));

          if (redeemedCount >= stampCard.allowedRepeats) {
            throw new BadRequestException('El cliente alcanzó el máximo de ciclos permitidos en esta tarjeta');
          }
        }

        const uscRepittCode = generateRepittCode(12, 4);
        const qrBuffer = await QRCode.toBuffer(uscRepittCode, {
          type: 'png', margin: 1, width: 1000,
          color: { dark: '#000000ff', light: '#ffffffff' },
        });
        const qrPath = await this.supabaseService.uploadBuffer(
          qrBuffer, 'image/png', `qr-user-stamp-cards/usc-${uscRepittCode}`,
        );

        const [newProgress] = await tx.insert(userStampCards).values({
          userId: customer.id,
          stampCardId: stampCard.id,
          repittCode: uscRepittCode,
          qrPath,
          visitsCount: 0,
        }).returning();
        progress = newProgress;
      }

      const visitResult = await this.registerVisit(tx, progress, stampCard);

      return {
        isNew,
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
        },
        ...visitResult,
      };
    });
  }

  async scanUser(ownerId: number, businessId: number, userRepittCode: string, stampCardId: number) {
    return await this.db.transaction(async (tx) => {
      // 1. Verify business ownership
      const [business] = await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
        .limit(1);
      if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

      // 2. Find user by repitt code
      const [customer] = await tx.select().from(users).where(eq(users.repittCode, userRepittCode)).limit(1);
      if (!customer) throw new NotFoundException('Usuario no encontrado');

      // 3. Find stamp card (must belong to this business)
      const [stampCard] = await tx
        .select()
        .from(stampCards)
        .where(and(eq(stampCards.id, stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
        .limit(1);
      if (!stampCard) throw new NotFoundException('Tarjeta de sellos no encontrada');

      // 4. Find active (non-redeemed) cycle, or create first one
      let [progress] = await tx
        .select()
        .from(userStampCards)
        .where(and(eq(userStampCards.userId, customer.id), eq(userStampCards.stampCardId, stampCard.id), eq(userStampCards.isRewardRedeemed, false)))
        .orderBy(desc(userStampCards.createdAt))
        .limit(1);

      if (!progress) {
        // Check if cycles are exhausted (allowedRepeats reached)
        if (stampCard.allowedRepeats !== null) {
          const [{ redeemedCount }] = await tx
            .select({ redeemedCount: sql<number>`CAST(COUNT(*) AS INT)` })
            .from(userStampCards)
            .where(and(eq(userStampCards.userId, customer.id), eq(userStampCards.stampCardId, stampCard.id), eq(userStampCards.isRewardRedeemed, true)));

          if (redeemedCount >= stampCard.allowedRepeats) {
            throw new BadRequestException('El cliente alcanzó el máximo de ciclos permitidos en esta tarjeta');
          }
        }
        const repittCode = generateRepittCode(12, 4);
        const qrBuffer = await QRCode.toBuffer(repittCode, {
          type: 'png',
          margin: 1,
          width: 1000,
          color: { dark: '#000000ff', light: '#ffffffff' },
        });
        const qrPath = await this.supabaseService.uploadBuffer(
          qrBuffer,
          'image/png',
          `qr-user-stamp-cards/usc-${repittCode}`,
        );

        const [newProgress] = await tx.insert(userStampCards).values({
          userId: customer.id,
          stampCardId: stampCard.id,
          repittCode,
          qrPath,
          visitsCount: 0,
        }).returning();
        progress = newProgress;
      }

      return this.registerVisit(tx, progress, stampCard);
    });
  }

  async scanByPhone(ownerId: number, businessId: number, phone: string, stampCardId: number) {
    return await this.db.transaction(async (tx) => {
      // 1. Verify business ownership
      const [business] = await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
        .limit(1);
      if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

      // 2. Find user by phone
      const [customer] = await tx.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (!customer) throw new NotFoundException('No se encontró un usuario con ese teléfono');

      // 3. Find stamp card (must belong to this business)
      const [stampCard] = await tx
        .select()
        .from(stampCards)
        .where(and(eq(stampCards.id, stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
        .limit(1);
      if (!stampCard) throw new NotFoundException('Tarjeta de sellos no encontrada');

      // 4. Find active (non-redeemed) cycle, or create first one
      let [progress] = await tx
        .select()
        .from(userStampCards)
        .where(and(eq(userStampCards.userId, customer.id), eq(userStampCards.stampCardId, stampCard.id), eq(userStampCards.isRewardRedeemed, false)))
        .orderBy(desc(userStampCards.createdAt))
        .limit(1);

      if (!progress) {
        if (stampCard.allowedRepeats !== null) {
          const [{ redeemedCount }] = await tx
            .select({ redeemedCount: sql<number>`CAST(COUNT(*) AS INT)` })
            .from(userStampCards)
            .where(and(eq(userStampCards.userId, customer.id), eq(userStampCards.stampCardId, stampCard.id), eq(userStampCards.isRewardRedeemed, true)));

          if (redeemedCount >= stampCard.allowedRepeats) {
            throw new BadRequestException('El cliente alcanzó el máximo de ciclos permitidos en esta tarjeta');
          }
        }
        const repittCode = generateRepittCode(12, 4);
        const qrBuffer = await QRCode.toBuffer(repittCode, {
          type: 'png',
          margin: 1,
          width: 1000,
          color: { dark: '#000000ff', light: '#ffffffff' },
        });
        const qrPath = await this.supabaseService.uploadBuffer(
          qrBuffer,
          'image/png',
          `qr-user-stamp-cards/usc-${repittCode}`,
        );

        const [newProgress] = await tx.insert(userStampCards).values({
          userId: customer.id,
          stampCardId: stampCard.id,
          repittCode,
          qrPath,
          visitsCount: 0,
        }).returning();
        progress = newProgress;
      }

      return this.registerVisit(tx, progress, stampCard);
    });
  }

  async scanByUserStampCard(ownerId: number, businessId: number, userStampCardRepittCode: string) {
    return await this.db.transaction(async (tx) => {
      // 1. Verify business ownership
      const [business] = await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
        .limit(1);
      if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

      // 2. Find UserStampCard by its repittCode
      const [progress] = await tx
        .select()
        .from(userStampCards)
        .where(eq(userStampCards.repittCode, userStampCardRepittCode))
        .limit(1);
      if (!progress) throw new NotFoundException('Tarjeta de sellos no encontrada');

      // 3. Find StampCard and verify it belongs to this business
      const [stampCard] = await tx
        .select()
        .from(stampCards)
        .where(and(eq(stampCards.id, progress.stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
        .limit(1);
      if (!stampCard) throw new NotFoundException('Tarjeta de sellos no encontrada o no pertenece a este negocio');

      return this.registerVisit(tx, progress, stampCard);
    });
  }

  private async registerVisit(tx: any, progress: any, stampCard: any) {
    if (progress.isCompleted) {
      throw new BadRequestException('La tarjeta está completada y el premio está pendiente de canje');
    }

    // Check cooldown (requiredHours)
    const [lastVisit] = await tx
      .select()
      .from(visits)
      .where(eq(visits.userStampCardId, progress.id))
      .orderBy(desc(visits.createdAt))
      .limit(1);

    if (lastVisit) {
      const hoursDiff = (Date.now() - lastVisit.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < stampCard.requiredHours) {
        throw new BadRequestException(`Espera al menos ${stampCard.requiredHours} horas entre visitas`);
      }
    }

    // Register visit and increment progress
    await tx.insert(visits).values({
      userId: progress.userId,
      userStampCardId: progress.id,
    });

    const newVisitsCount = progress.visitsCount + 1;
    const isCompleted = newVisitsCount >= stampCard.requiredStamps;

    const [updatedProgress] = await tx.update(userStampCards)
      .set({
        visitsCount: newVisitsCount,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(userStampCards.id, progress.id))
      .returning();

    return {
      message: 'Visit registered successfully',
      progress: updatedProgress,
    };
  }
}
