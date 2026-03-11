import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { users, stampCards, userStampCards, visits } from '../database/schema';

@Injectable()
export class VisitsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
  ) {}

  async scanUser(businessUserId: number, repittCode: string, stampCardId: number) {
    return await this.db.transaction(async (tx) => {
      // 1. Find User by Repitt Code
      const [customer] = await tx.select().from(users).where(eq(users.repittCode, repittCode)).limit(1);
      if (!customer) throw new NotFoundException('User not found');

      // 2. Find Stamp Card
      const [stampCard] = await tx.select().from(stampCards).where(eq(stampCards.id, stampCardId)).limit(1);
      if (!stampCard) throw new NotFoundException('Stamp card not found');

      // 3. Find or Create UserStampCard progress tracking
      let [progress] = await tx
        .select()
        .from(userStampCards)
        .where(
          and(
            eq(userStampCards.userId, customer.id),
            eq(userStampCards.stampCardId, stampCard.id)
          )
        )
        .limit(1);

      if (!progress) {
        const [newProgress] = await tx.insert(userStampCards).values({
          userId: customer.id,
          stampCardId: stampCard.id,
          visitsCount: 0,
        }).returning();
        progress = newProgress;
      }

      if (progress.isCompleted) {
        throw new BadRequestException('Stamp card is already completed');
      }

      // 4. Check Cooldown (requiredHours)
      const [lastVisit] = await tx
        .select()
        .from(visits)
        .where(eq(visits.userStampCardId, progress.id))
        .orderBy(desc(visits.createdAt))
        .limit(1);

      if (lastVisit) {
        const now = new Date();
        const hoursDiff = (now.getTime() - lastVisit.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff < stampCard.requiredHours) {
          throw new BadRequestException(`Wait at least ${stampCard.requiredHours} hours between visits`);
        }
      }

      // 5. Register new Visit and increment progress
      await tx.insert(visits).values({
        userId: customer.id,
        userStampCardId: progress.id,
      });

      const newVisitsCount = progress.visitsCount + 1;
      const isCompleted = newVisitsCount >= stampCard.requiredStamps;

      const [updatedProgress] = await tx.update(userStampCards)
        .set({
          visitsCount: newVisitsCount,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(userStampCards.id, progress.id))
        .returning();

      return {
        message: 'Visit registered successfully',
        progress: updatedProgress,
      };
    });
  }
}

