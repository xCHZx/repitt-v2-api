import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions.schema';

export const subscriptionItems = pgTable('subscription_items', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id).notNull(),

  provider: varchar('provider', { length: 50 }).notNull(),
  providerItemId: varchar('provider_item_id', { length: 255 }).notNull().unique(), // si_xxx
  providerPriceId: varchar('provider_price_id', { length: 255 }).notNull(),
  providerProductId: varchar('provider_product_id', { length: 255 }),
  quantity: integer('quantity').default(1).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
