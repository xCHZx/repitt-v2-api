import { pgTable, serial, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { accountStatuses } from './catalogs.schema';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  repittCode: varchar('repitt_code', { length: 20 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  accountStatusId: integer('account_status_id')
    .references(() => accountStatuses.id)
    .notNull(),
  qrPath: varchar('qr_path', { length: 500 }),
  hasVerifiedEmail: boolean('has_verified_email').default(false).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});
