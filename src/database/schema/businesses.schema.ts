import { pgTable, serial, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { categories } from './catalogs.schema';

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  categoryId: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  repittCode: varchar('repitt_code', { length: 20 }).notNull().unique(),
  openingHours: text('opening_hours'),
  isActive: boolean('is_active').default(false).notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }), // 1 customer Stripe por negocio
  logoPath: varchar('logo_path', { length: 500 }),
  qrPath: varchar('qr_path', { length: 500 }),
  flyerPath: varchar('flyer_path', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});
