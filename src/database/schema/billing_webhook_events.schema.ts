import { pgTable, serial, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const billingWebhookEvents = pgTable('billing_webhook_events', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),                       // 'stripe' | 'paddle'
  providerEventId: varchar('provider_event_id', { length: 255 }).notNull().unique(), // evt_xxx — idempotencia
  type: varchar('type', { length: 100 }).notNull(),                              // raw: 'customer.subscription.updated'
  normalizedType: varchar('normalized_type', { length: 100 }),                   // tuyo: 'subscription.updated'
  payload: jsonb('payload').notNull(),                                           // raw completo del provider
  processedAt: timestamp('processed_at'),                                        // null = pendiente o fallido
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
