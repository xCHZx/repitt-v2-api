import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { PLAN_LIMITS } from '../common/constants/plans';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { businesses, stampCards, userStampCards, users, visits } from '../database/schema';
import { CreateStampCardDto } from './dto/create-stamp-card.dto';
import { UpdateStampCardDto } from './dto/update-stamp-card.dto';

@Injectable()
export class StampCardsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
  ) {}

  async getBusinessStampCards(businessId: number) {
    return await this.db
      .select()
      .from(stampCards)
      .where(
        and(
          eq(stampCards.businessId, businessId),
          eq(stampCards.isActive, true),
          isNull(stampCards.deletedAt),
        ),
      );
  }

  async getMyBusinessStampCards(businessId: number, userId: number) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId), isNull(businesses.deletedAt)))
      .limit(1);

    if (!business) throw new NotFoundException('Negocio no encontrado');

    return await this.db
      .select()
      .from(stampCards)
      .where(and(eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)));
  }

  async findOne(businessId: number, stampCardId: number) {
    const [card] = await this.db
      .select()
      .from(stampCards)
      .where(
        and(
          eq(stampCards.id, stampCardId),
          eq(stampCards.businessId, businessId),
          isNull(stampCards.deletedAt),
        ),
      )
      .limit(1);

    if (!card) throw new NotFoundException('Tarjeta de sellos no encontrada');

    return card;
  }

  async findOneOwner(businessId: number, stampCardId: number, userId: number) {
    const [result] = await this.db
      .select({
        id: stampCards.id,
        name: stampCards.name,
        description: stampCards.description,
        requiredStamps: stampCards.requiredStamps,
        requiredHours: stampCards.requiredHours,
        reward: stampCards.reward,
        primaryColor: stampCards.primaryColor,
        stampIconPath: stampCards.stampIconPath,
        startDate: stampCards.startDate,
        endDate: stampCards.endDate,
        businessId: stampCards.businessId,
        businessName: businesses.name,
        businessLogoPath: businesses.logoPath,
        visitsCount: sql<number>`CAST(COUNT(${visits.id}) AS INT)`,
        isActive: stampCards.isActive,
        isCompleted: stampCards.isCompleted,
        createdAt: stampCards.createdAt,
        updatedAt: stampCards.updatedAt,
        deletedAt: stampCards.deletedAt,
      })
      .from(stampCards)
      .innerJoin(
        businesses,
        and(eq(businesses.id, stampCards.businessId), eq(businesses.userId, userId), isNull(businesses.deletedAt)),
      )
      .leftJoin(userStampCards, eq(userStampCards.stampCardId, stampCards.id))
      .leftJoin(visits, eq(visits.userStampCardId, userStampCards.id))
      .where(and(eq(stampCards.id, stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .groupBy(stampCards.id, businesses.id)
      .limit(1);

    if (!result) throw new NotFoundException('Tarjeta de sellos no encontrada');

    return result;
  }

  async getStampCardVisits(ownerId: number, businessId: number, stampCardId: number) {
    // Verify ownership
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
      .limit(1);
    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    // Verify stamp card belongs to this business
    const [card] = await this.db
      .select({ id: stampCards.id })
      .from(stampCards)
      .where(and(eq(stampCards.id, stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .limit(1);
    if (!card) throw new NotFoundException('Tarjeta de sellos no encontrada');

    const rows = await this.db
      .select({
        id: visits.id,
        createdAt: visits.createdAt,
        userStampCardId: visits.userStampCardId,
        customer: {
          firstName: users.firstName,
          lastName: users.lastName,
          repittCode: users.repittCode,
        },
      })
      .from(visits)
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(users, eq(users.id, visits.userId))
      .where(eq(userStampCards.stampCardId, stampCardId))
      .orderBy(desc(visits.createdAt));

    return {
      totalVisits: rows.length,
      visits: rows,
    };
  }

  async updateIconPath(userId: number, businessId: number, stampCardId: number, iconPath: string) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId), isNull(businesses.deletedAt)))
      .limit(1);

    if (!business) throw new NotFoundException('Negocio no encontrado');

    const [card] = await this.db
      .select({ id: stampCards.id })
      .from(stampCards)
      .where(and(eq(stampCards.id, stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .limit(1);

    if (!card) throw new NotFoundException('Tarjeta de sellos no encontrada');

    const [updated] = await this.db
      .update(stampCards)
      .set({ stampIconPath: iconPath, updatedAt: new Date() })
      .where(eq(stampCards.id, stampCardId))
      .returning();

    return updated;
  }

  async update(userId: number, businessId: number, stampCardId: number, dto: UpdateStampCardDto) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId), isNull(businesses.deletedAt)))
      .limit(1);

    if (!business) throw new NotFoundException('Negocio no encontrado');

    const [card] = await this.db
      .select({ id: stampCards.id })
      .from(stampCards)
      .where(and(eq(stampCards.id, stampCardId), eq(stampCards.businessId, businessId), isNull(stampCards.deletedAt)))
      .limit(1);

    if (!card) throw new NotFoundException('Tarjeta de sellos no encontrada');

    const [updated] = await this.db
      .update(stampCards)
      .set({
        ...( dto.name !== undefined && { name: dto.name }),
        ...( dto.description !== undefined && { description: dto.description }),
        ...( dto.requiredStamps !== undefined && { requiredStamps: dto.requiredStamps }),
        ...( dto.requiredHours !== undefined && { requiredHours: dto.requiredHours }),
        ...( dto.reward !== undefined && { reward: dto.reward }),
        ...( dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
        ...( dto.isActive !== undefined && { isActive: dto.isActive }),
        ...( dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...( dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...( dto.allowedRepeats !== undefined && { allowedRepeats: dto.allowedRepeats }),
        updatedAt: new Date(),
      })
      .where(eq(stampCards.id, stampCardId))
      .returning();

    return updated;
  }

  async create(userId: number, businessId: number, dto: CreateStampCardDto) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, userId), isNull(businesses.deletedAt)))
      .limit(1);

    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    const [user] = await this.db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);
    const limits = PLAN_LIMITS[user?.plan ?? 'free'];

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(stampCards)
      .innerJoin(businesses, and(eq(businesses.id, stampCards.businessId), eq(businesses.userId, userId), isNull(businesses.deletedAt)))
      .where(isNull(stampCards.deletedAt));

    if (total >= limits.maxStampCards) {
      throw new ForbiddenException(`Tu plan permite un máximo de ${limits.maxStampCards} tarjeta(s) de sellos. Actualiza a premium para obtener más.`);
    }

    const [newCard] = await this.db
      .insert(stampCards)
      .values({
        businessId,
        name: dto.name,
        description: dto.description,
        requiredStamps: dto.requiredStamps,
        requiredHours: dto.requiredHours,
        reward: dto.reward,
        primaryColor: dto.primaryColor,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        allowedRepeats: dto.allowedRepeats ?? null,
      })
      .returning();

    return newCard;
  }
}
