import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as catalogsSchema from '../database/schema/catalogs.schema';

@Injectable()
export class CatalogsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof catalogsSchema>,
  ) {}

  async getCategories() {
    return this.db
      .select({
        id: catalogsSchema.categories.id,
        name: catalogsSchema.categories.name,
      })
      .from(catalogsSchema.categories)
      .where(eq(catalogsSchema.categories.active, true))
      .orderBy(catalogsSchema.categories.name);
  }
}
