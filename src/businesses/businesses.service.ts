import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { businesses, categories, stampCards, subscriptions, userStampCards, users, visits } from '../database/schema';
import { generateRepittCode } from '../common/utils/code-generator.util';
import { FlyerService } from '../flyer/flyer.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BusinessesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
    private readonly flyerService: FlyerService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: number, dto: CreateBusinessDto) {

    const repittCode = generateRepittCode();
    const siteUrl = this.configService.get<string>('SITE_URL') || 'https://repitt.com';
    const bizPublicUrl = `${siteUrl}/visitante/negocios/${repittCode}`;

    const qrBuffer = await QRCode.toBuffer(bizPublicUrl, {
      type: 'png',
      margin: 1,
      width: 1000,
      color: { dark: '#000000ff', light: '#ffffffff' },
    });
    const qrPath = await this.supabaseService.uploadBuffer(
      qrBuffer,
      'image/png',
      `qr-businesses/biz-${repittCode}`,
    );
    const flyerPath = await this.flyerService.generateFlyer(repittCode, qrBuffer);

    const [newBusiness] = await this.db
      .insert(businesses)
      .values({
        name: dto.name,
        categoryId: dto.categoryId,
        userId,
        repittCode,
        qrPath,
        flyerPath,
        description: dto.description,
        address: dto.address,
        phone: dto.phone,
        openingHours: dto.openingHours,
      })
      .returning();

    return this.findById(newBusiness.id);
  }

  async findMyBusinesses(userId: number) {
    // Fetch all active businesses belonging to the user
    const myBusinesses = await this.db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        businessRepittCode: businesses.repittCode,
        openingHours: businesses.openingHours,
        logoPath: businesses.logoPath,
        qrPath: businesses.qrPath,
        flyerPath: businesses.flyerPath,
        isActive: businesses.isActive,
        createdAt: businesses.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(businesses)
      .leftJoin(categories, eq(businesses.categoryId, categories.id))
      .where(and(eq(businesses.userId, userId), isNull(businesses.deletedAt)));

    // For each business, fetch its stamp cards
    const result = await Promise.all(
      myBusinesses.map(async (business) => {
        const cards = await this.db
          .select({
            id: stampCards.id,
            name: stampCards.name,
            description: stampCards.description,
            requiredStamps: stampCards.requiredStamps,
            reward: stampCards.reward,
            isActive: stampCards.isActive,
            primaryColor: stampCards.primaryColor,
          })
          .from(stampCards)
          .where(and(eq(stampCards.businessId, business.id), isNull(stampCards.deletedAt)));

        return {
          ...business,
          stampCards: cards,
        };
      }),
    );

    return { data: result };
  }
  async findById(businessId: number) {
    const result = await this.db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        businessRepittCode: businesses.repittCode,
        openingHours: businesses.openingHours,
        logoPath: businesses.logoPath,
        qrPath: businesses.qrPath,
        flyerPath: businesses.flyerPath,
        isActive: businesses.isActive,
        createdAt: businesses.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(businesses)
      .leftJoin(categories, eq(businesses.categoryId, categories.id))
      .where(eq(businesses.id, businessId));

    if (result.length === 0) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const cards = await this.db
      .select({
        id: stampCards.id,
        name: stampCards.name,
        description: stampCards.description,
        requiredStamps: stampCards.requiredStamps,
        reward: stampCards.reward,
        isActive: stampCards.isActive,
        primaryColor: stampCards.primaryColor,
      })
      .from(stampCards)
      .where(and(eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)));

    return {
      data: {
        ...result[0],
        stampCards: cards,
      },
    };
  }

  async findByRepittCode(repittCode: string) {
    const result = await this.db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        businessRepittCode: businesses.repittCode,
        openingHours: businesses.openingHours,
        logoPath: businesses.logoPath,
        qrPath: businesses.qrPath,
        flyerPath: businesses.flyerPath,
        isActive: businesses.isActive,
        createdAt: businesses.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
        },
      })
      .from(businesses)
      .leftJoin(categories, eq(businesses.categoryId, categories.id))
      .where(and(eq(businesses.repittCode, repittCode), isNull(businesses.deletedAt)))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const cards = await this.db
      .select({
        id: stampCards.id,
        name: stampCards.name,
        description: stampCards.description,
        requiredStamps: stampCards.requiredStamps,
        reward: stampCards.reward,
        isActive: stampCards.isActive,
        primaryColor: stampCards.primaryColor,
      })
      .from(stampCards)
      .where(and(eq(stampCards.businessId, result[0].id), isNull(stampCards.deletedAt)));

    return {
      data: {
        ...result[0],
        stampCards: cards,
      },
    };
  }

  async redeemReward(ownerId: number, businessId: number, userStampCardId: number) {
    return await this.db.transaction(async (tx) => {
      const [business] = await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
        .limit(1);
      if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

      const [record] = await tx
        .select({
          id: userStampCards.id,
          userId: userStampCards.userId,
          stampCardId: userStampCards.stampCardId,
          isCompleted: userStampCards.isCompleted,
          isRewardRedeemed: userStampCards.isRewardRedeemed,
          allowedRepeats: stampCards.allowedRepeats,
        })
        .from(userStampCards)
        .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
        .where(eq(userStampCards.id, userStampCardId))
        .limit(1);

      if (!record) throw new NotFoundException('Tarjeta de sellos del usuario no encontrada');
      if (!record.isCompleted) throw new BadRequestException('La tarjeta de sellos aún no está completada');
      if (record.isRewardRedeemed) throw new BadRequestException('El premio ya fue canjeado');

      const [updated] = await tx
        .update(userStampCards)
        .set({ isRewardRedeemed: true, redeemedAt: new Date(), updatedAt: new Date() })
        .where(eq(userStampCards.id, userStampCardId))
        .returning();

      // Create next cycle if repeats remain
      let nextCycle = null;
      if (record.allowedRepeats === null) {
        // Unlimited — always open a new cycle
        nextCycle = await this.createNextCycle(tx, record.userId, record.stampCardId);
      } else {
        const [{ redeemedCount }] = await tx
          .select({ redeemedCount: sql<number>`CAST(COUNT(*) AS INT)` })
          .from(userStampCards)
          .where(and(eq(userStampCards.userId, record.userId), eq(userStampCards.stampCardId, record.stampCardId), eq(userStampCards.isRewardRedeemed, true)));

        if (redeemedCount < record.allowedRepeats) {
          nextCycle = await this.createNextCycle(tx, record.userId, record.stampCardId);
        }
      }

      return { ...updated, nextCycle };
    });
  }

  private async createNextCycle(tx: any, userId: number, stampCardId: number) {
    const repittCode = generateRepittCode(12, 4);
    const qrBuffer = await QRCode.toBuffer(repittCode, {
      type: 'png',
      margin: 1,
      width: 1000,
      color: { dark: '#000000ff', light: '#ffffffff' },
    });
    const qrPath = await this.supabaseService.uploadBuffer(qrBuffer, 'image/png', `qr-user-stamp-cards/usc-${repittCode}`);
    const [newCard] = await tx.insert(userStampCards).values({ userId, stampCardId, repittCode, qrPath, visitsCount: 0 }).returning();
    return newCard;
  }

  async getPendingRedeem(ownerId: number, businessId: number) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
      .limit(1);
    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    return await this.db
      .select({
        id: userStampCards.id,
        completedAt: userStampCards.completedAt,
        stampCard: {
          id: stampCards.id,
          name: stampCards.name,
          reward: stampCards.reward,
        },
        customer: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(userStampCards)
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .innerJoin(users, eq(users.id, userStampCards.userId))
      .where(and(eq(userStampCards.isCompleted, true), eq(userStampCards.isRewardRedeemed, false)))
      .orderBy(desc(userStampCards.completedAt));
  }

  async findUserStampCard(ownerId: number, businessId: number, userStampCardId: number) {
    // Verify business ownership
    const [business] = await this.db
      .select({ id: businesses.id, name: businesses.name, logoPath: businesses.logoPath })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
      .limit(1);
    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    // Get userStampCard ensuring it belongs to a stampCard of this business
    const [record] = await this.db
      .select({
        id: userStampCards.id,
        visitsCount: userStampCards.visitsCount,
        isCompleted: userStampCards.isCompleted,
        isRewardRedeemed: userStampCards.isRewardRedeemed,
        completedAt: userStampCards.completedAt,
        redeemedAt: userStampCards.redeemedAt,
        stampCard: {
          name: stampCards.name,
          description: stampCards.description,
          requiredStamps: stampCards.requiredStamps,
          reward: stampCards.reward,
          isActive: stampCards.isActive,
          primaryColor: stampCards.primaryColor,
          stampIconPath: stampCards.stampIconPath,
          startDate: stampCards.startDate,
          endDate: stampCards.endDate,
        },
        customer: {
          firstName: users.firstName,
          lastName: users.lastName,
          repittCode: users.repittCode,
        },
      })
      .from(userStampCards)
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .innerJoin(users, eq(users.id, userStampCards.userId))
      .where(eq(userStampCards.id, userStampCardId))
      .limit(1);

    if (!record) throw new NotFoundException('Tarjeta de sellos del usuario no encontrada');

    const userVisits = await this.db
      .select({ id: visits.id, createdAt: visits.createdAt })
      .from(visits)
      .where(eq(visits.userStampCardId, userStampCardId))
      .orderBy(desc(visits.createdAt));

    return {
      ...record,
      business: { name: business.name, logoPath: business.logoPath },
      visits: userVisits,
    };
  }

  async getCustomers(ownerId: number, businessId: number) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
      .limit(1);
    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    // 1. Unique customers with visit aggregates
    const customers = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        totalVisits: sql<number>`CAST(COUNT(DISTINCT ${visits.id}) AS INT)`,
        lastVisitAt: sql<Date>`MAX(${visits.createdAt})`,
        joinedAt: sql<Date>`MIN(${visits.createdAt})`,
      })
      .from(users)
      .innerJoin(visits, eq(visits.userId, users.id))
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .groupBy(users.id)
      .orderBy(desc(sql`MAX(${visits.createdAt})`));

    if (customers.length === 0) {
      return { totalCustomers: 0, customers: [] };
    }

    // 2. Active stamp cards per customer for this business
    const customerIds = customers.map((c) => c.id);
    const activeStampCards = await this.db
      .select({
        userId: userStampCards.userId,
        id: userStampCards.id,
        visitsCount: userStampCards.visitsCount,
        isCompleted: userStampCards.isCompleted,
        isRewardRedeemed: userStampCards.isRewardRedeemed,
        stampCard: {
          id: stampCards.id,
          name: stampCards.name,
          requiredStamps: stampCards.requiredStamps,
          reward: stampCards.reward,
        },
      })
      .from(userStampCards)
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .where(and(inArray(userStampCards.userId, customerIds), eq(userStampCards.isRewardRedeemed, false)));

    // 3. Merge
    const stampCardsByUser = new Map<number, typeof activeStampCards>();
    for (const sc of activeStampCards) {
      if (!stampCardsByUser.has(sc.userId)) stampCardsByUser.set(sc.userId, []);
      stampCardsByUser.get(sc.userId)!.push(sc);
    }

    const result = customers.map(({ id, ...customer }) => ({
      id,
      ...customer,
      stampCards: (stampCardsByUser.get(id) ?? []).map(({ userId, ...sc }) => sc),
    }));

    return { totalCustomers: result.length, customers: result };
  }

  async getCustomer(ownerId: number, businessId: number, customerId: number) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
      .limit(1);
    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    // 1. Customer stats in this business
    const [customer] = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        totalVisits: sql<number>`CAST(COUNT(DISTINCT ${visits.id}) AS INT)`,
        lastVisitAt: sql<Date>`MAX(${visits.createdAt})`,
        joinedAt: sql<Date>`MIN(${visits.createdAt})`,
      })
      .from(users)
      .innerJoin(visits, eq(visits.userId, users.id))
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .where(eq(users.id, customerId))
      .groupBy(users.id)
      .limit(1);

    if (!customer) throw new NotFoundException('Cliente no encontrado en este negocio');

    // 2. Full cycle history for this business
    const cycles = await this.db
      .select({
        id: userStampCards.id,
        visitsCount: userStampCards.visitsCount,
        isCompleted: userStampCards.isCompleted,
        isRewardRedeemed: userStampCards.isRewardRedeemed,
        completedAt: userStampCards.completedAt,
        redeemedAt: userStampCards.redeemedAt,
        createdAt: userStampCards.createdAt,
        stampCard: {
          id: stampCards.id,
          name: stampCards.name,
          requiredStamps: stampCards.requiredStamps,
          reward: stampCards.reward,
        },
      })
      .from(userStampCards)
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .where(eq(userStampCards.userId, customerId))
      .orderBy(desc(userStampCards.createdAt));

    return { ...customer, stampCards: cycles };
  }

  async update(userId: number, businessId: number, updateDto: any) {
    // 1. Verify business exists and user is owner
    const existing = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId), isNull(businesses.deletedAt)))
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundException('Negocio no encontrado o no tienes permiso para editarlo');
    }

    // 2. Filter out undefined values to avoid overwriting existing properties with null
    const updates: Partial<typeof businesses.$inferInsert> = {};
    if (updateDto.name !== undefined) updates.name = updateDto.name;
    if (updateDto.description !== undefined) updates.description = updateDto.description;
    if (updateDto.address !== undefined) updates.address = updateDto.address;
    if (updateDto.phone !== undefined) updates.phone = updateDto.phone;
    if (updateDto.categoryId !== undefined) updates.categoryId = updateDto.categoryId;
    if (updateDto.openingHours !== undefined) updates.openingHours = updateDto.openingHours;
    if (updateDto.isActive !== undefined) updates.isActive = updateDto.isActive;
    if (updateDto.logoPath !== undefined) updates.logoPath = updateDto.logoPath;
    
    updates.updatedAt = new Date(); // Automatically update the timestamp

    // 3. Perform Update
    await this.db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, businessId));

    // 4. Return the refreshed profile using our own `findById` existing logic
    return this.findById(businessId);
  }
}
