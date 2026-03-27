import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { businesses, users, stampCards, userStampCards, visits } from '../database/schema';

@Injectable()
export class MetricsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
  ) {}

  private getDateRanges(timePeriod: string) {
    const now = new Date();

    switch (timePeriod) {
      case 'day': {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        return { current: { start: todayStart, end: todayEnd }, previous: { start: yesterdayStart, end: yesterdayEnd } };
      }
      case 'week': {
        const day = now.getDay();
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 7);
        const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 1, 23, 59, 59, 999);
        return { current: { start: thisWeekStart, end: now }, previous: { start: lastWeekStart, end: lastWeekEnd } };
      }
      case 'year': {
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return { current: { start: thisYearStart, end: now }, previous: { start: lastYearStart, end: lastYearEnd } };
      }
      default: { // month (default)
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { current: { start: thisMonthStart, end: now }, previous: { start: lastMonthStart, end: lastMonthEnd } };
      }
    }
  }

  private calcGrowth(current: number, previous: number): number | null {
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10; // 1 decimal
  }

  async getMetrics(ownerId: number, businessId: number, timePeriod: string) {
    const [business] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.userId, ownerId), isNull(businesses.deletedAt)))
      .limit(1);
    if (!business) throw new ForbiddenException('Negocio no encontrado o acceso denegado');

    const range = this.getDateRanges(timePeriod);

    const [visitsMetric, redeemedRewardsMetric, completedStampCardsMetric, activeUsers, topClients, visitsByMonth] =
      await Promise.all([
        this.getVisitsMetric(businessId, range),
        this.getRedeemedRewardsMetric(businessId, range),
        this.getCompletedStampCardsMetric(businessId, range),
        this.getActiveUsers(businessId),
        this.getTopClients(businessId, range),
        this.getVisitsByMonth(businessId),
      ]);

    return {
      visits: visitsMetric,
      redeemedRewards: redeemedRewardsMetric,
      completedStampCards: completedStampCardsMetric,
      activeUsers,
      topClients,
      visitsByMonth,
    };
  }

  private async countVisits(businessId: number, start: Date, end: Date): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(visits)
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .where(and(gte(visits.createdAt, start), lte(visits.createdAt, end)));
    return result.count;
  }

  private async getVisitsMetric(businessId: number, range: any) {
    const [current, previous] = await Promise.all([
      this.countVisits(businessId, range.current.start, range.current.end),
      this.countVisits(businessId, range.previous.start, range.previous.end),
    ]);
    return { current, previous, growth: this.calcGrowth(current, previous) };
  }

  private async countUserStampCards(
    businessId: number,
    conditions: any[],
  ): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(userStampCards)
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .where(and(...conditions));
    return result.count;
  }

  private async getRedeemedRewardsMetric(businessId: number, range: any) {
    const [current, previous] = await Promise.all([
      this.countUserStampCards(businessId, [
        eq(userStampCards.isRewardRedeemed, true),
        gte(userStampCards.redeemedAt, range.current.start),
        lte(userStampCards.redeemedAt, range.current.end),
      ]),
      this.countUserStampCards(businessId, [
        eq(userStampCards.isRewardRedeemed, true),
        gte(userStampCards.redeemedAt, range.previous.start),
        lte(userStampCards.redeemedAt, range.previous.end),
      ]),
    ]);
    return { current, previous, growth: this.calcGrowth(current, previous) };
  }

  private async getCompletedStampCardsMetric(businessId: number, range: any) {
    const [current, previous] = await Promise.all([
      this.countUserStampCards(businessId, [
        eq(userStampCards.isCompleted, true),
        gte(userStampCards.completedAt, range.current.start),
        lte(userStampCards.completedAt, range.current.end),
      ]),
      this.countUserStampCards(businessId, [
        eq(userStampCards.isCompleted, true),
        gte(userStampCards.completedAt, range.previous.start),
        lte(userStampCards.completedAt, range.previous.end),
      ]),
    ]);
    return { current, previous, growth: this.calcGrowth(current, previous) };
  }

  private async getActiveUsers(businessId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(userStampCards)
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .where(and(eq(userStampCards.isActive, true), eq(userStampCards.isCompleted, false)));
    return result.count;
  }

  private async getTopClients(businessId: number, range: any) {
    return await this.db
      .select({
        userId: visits.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        repittCode: users.repittCode,
        visitsCount: sql<number>`CAST(COUNT(${visits.id}) AS INT)`,
      })
      .from(visits)
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .innerJoin(users, eq(users.id, visits.userId))
      .where(and(gte(visits.createdAt, range.current.start), lte(visits.createdAt, range.current.end)))
      .groupBy(visits.userId, users.id)
      .orderBy(desc(sql<number>`COUNT(${visits.id})`))
      .limit(3);
  }

  private async getVisitsByMonth(businessId: number) {
    const year = new Date().getFullYear();

    const rows = await this.db
      .select({
        month: sql<number>`CAST(EXTRACT(MONTH FROM ${visits.createdAt}) AS INT)`,
        visitsCount: sql<number>`CAST(COUNT(*) AS INT)`,
      })
      .from(visits)
      .innerJoin(userStampCards, eq(userStampCards.id, visits.userStampCardId))
      .innerJoin(stampCards, and(eq(stampCards.id, userStampCards.stampCardId), eq(stampCards.businessId, businessId)))
      .where(sql`EXTRACT(YEAR FROM ${visits.createdAt}) = ${year}`)
      .groupBy(sql`EXTRACT(MONTH FROM ${visits.createdAt})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${visits.createdAt})`);

    // Always return all 12 months, 0 for months with no visits
    const map = new Map(rows.map((r) => [r.month, r.visitsCount]));
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      visitsCount: map.get(i + 1) ?? 0,
    }));
  }
}
