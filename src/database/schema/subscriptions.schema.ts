import { pgTable, serial, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { businesses } from './businesses.schema';

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  businessId: integer('business_id').references(() => businesses.id), // 1 sub = 1 negocio

  // Provider references — agnóstico
  provider: varchar('provider', { length: 50 }).notNull(),          // 'stripe' | 'paddle'
  providerSubId: varchar('provider_sub_id', { length: 255 }).notNull().unique(), // sub_xxx

  // Status normalizado a nuestro propio enum — no depende del provider
  // 'trialing' | 'active' | 'past_due' | 'grace_period' | 'canceled' | 'unpaid' | 'paused'
  status: varchar('status', { length: 50 }).notNull(),

  providerPriceId: varchar('provider_price_id', { length: 255 }),   // price_xxx
  providerProductId: varchar('provider_product_id', { length: 255 }), // prod_xxx
  quantity: integer('quantity').default(1).notNull(),

  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  canceledAt: timestamp('canceled_at'),
  endsAt: timestamp('ends_at'), // Gracia: activo hasta aquí aunque ya canceló

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
