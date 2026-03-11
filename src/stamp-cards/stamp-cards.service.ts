import { Inject, Injectable } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { stampCards } from '../database/schema';

@Injectable()
export class StampCardsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
  ) {}

  async getBusinessStampCards(businessId: number) {
    return await this.db.select().from(stampCards).where(eq(stampCards.businessId, businessId));
  }
}

