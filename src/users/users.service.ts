import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { users, accountStatuses, visits, userStampCards, stampCards, businesses, categories } from '../database/schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
  ) {}

  async updateMe(userId: number, dto: UpdateUserDto) {
    if (!dto.firstName && !dto.lastName && dto.phone === undefined) {
      throw new BadRequestException('Debes proporcionar al menos un campo');
    }

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.phone !== undefined) updates.phone = dto.phone;

    const [updated] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        repittCode: users.repittCode,
        updatedAt: users.updatedAt,
      });

    return updated;
  }

  async findByEmail(email: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0];
  }

  async findByPhone(phone: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    return result[0];
  }

  async findMe(userId: number) {
    const [profile, bizResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          plan: users.plan,
          repittCode: users.repittCode,
          qrPath: users.qrPath,
          hasVerifiedEmail: users.hasVerifiedEmail,
          createdAt: users.createdAt,
          accountStatus: {
            name: accountStatuses.name,
          },
          visitsCount: sql<number>`CAST(COUNT(${visits.id}) AS INT)`,
        })
        .from(users)
        .leftJoin(accountStatuses, eq(users.accountStatusId, accountStatuses.id))
        .leftJoin(visits, eq(visits.userId, users.id))
        .where(eq(users.id, userId))
        .groupBy(users.id, accountStatuses.id)
        .limit(1),
      this.db
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(eq(businesses.userId, userId), isNull(businesses.deletedAt)))
        .limit(1),
    ]);

    if (!profile[0]) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      role: bizResult.length > 0 ? 'Owner' : 'Visitor',
      data: profile[0],
    };
  }

  async findMyStampCard(userId: number, userStampCardId: number) {
    const [record] = await this.db
      .select({
        id: userStampCards.id,
        repittCode: userStampCards.repittCode,
        qrPath: userStampCards.qrPath,
        visitsCount: userStampCards.visitsCount,
        isActive: userStampCards.isActive,
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
          startDate: stampCards.startDate,
          endDate: stampCards.endDate,
          stampIconPath: stampCards.stampIconPath,
          primaryColor: stampCards.primaryColor,
        },
        business: {
          name: businesses.name,
          logoPath: businesses.logoPath,
        },
      })
      .from(userStampCards)
      .innerJoin(stampCards, eq(stampCards.id, userStampCards.stampCardId))
      .innerJoin(businesses, and(eq(businesses.id, stampCards.businessId), isNull(businesses.deletedAt)))
      .where(and(eq(userStampCards.id, userStampCardId), eq(userStampCards.userId, userId)))
      .limit(1);

    if (!record) throw new NotFoundException('Tarjeta de sellos no encontrada');

    const userVisits = await this.db
      .select({ id: visits.id, createdAt: visits.createdAt })
      .from(visits)
      .where(eq(visits.userStampCardId, userStampCardId));

    return { ...record, visits: userVisits };
  }

  async getMyVisits(userId: number) {
    const rows = await this.db
      .select({
        id: visits.id,
        createdAt: visits.createdAt,
        stampCard: {
          id: stampCards.id,
          name: stampCards.name,
          stampIconPath: stampCards.stampIconPath,
        },
        business: {
          name: businesses.name,
          logoPath: businesses.logoPath,
        },
      })
      .from(visits)
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(stampCards, eq(stampCards.id, userStampCards.stampCardId))
      .innerJoin(businesses, and(eq(businesses.id, stampCards.businessId), isNull(businesses.deletedAt)))
      .where(eq(visits.userId, userId))
      .orderBy(desc(visits.createdAt));

    return {
      totalVisits: rows.length,
      visits: rows,
    };
  }

  async getMyStampCards(userId: number) {
    return await this.db
      .select({
        id: userStampCards.id,
        repittCode: userStampCards.repittCode,
        visitsCount: userStampCards.visitsCount,
        isActive: userStampCards.isActive,
        isCompleted: userStampCards.isCompleted,
        isRewardRedeemed: userStampCards.isRewardRedeemed,
        completedAt: userStampCards.completedAt,
        redeemedAt: userStampCards.redeemedAt,
        stampCard: {
          id: stampCards.id,
          name: stampCards.name,
          requiredStamps: stampCards.requiredStamps,
          reward: stampCards.reward,
          isActive: stampCards.isActive,
          primaryColor: stampCards.primaryColor,
          stampIconPath: stampCards.stampIconPath,
        },
        business: {
          name: businesses.name,
          logoPath: businesses.logoPath,
          categoryName: categories.name,
        },
      })
      .from(userStampCards)
      .innerJoin(stampCards, eq(stampCards.id, userStampCards.stampCardId))
      .innerJoin(businesses, and(eq(businesses.id, stampCards.businessId), isNull(businesses.deletedAt)))
      .innerJoin(categories, eq(categories.id, businesses.categoryId))
      .where(eq(userStampCards.userId, userId));
  }
}


