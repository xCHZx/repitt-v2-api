import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

export const phoneOtps = pgTable('phone_otps', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull(),
  code: varchar('code', { length: 255 }).notNull(),          // Hashed
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
