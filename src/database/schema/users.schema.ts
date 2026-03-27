import { pgTable, serial, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { accountStatuses } from './catalogs.schema';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),           // Opcional para visitantes
  phone: varchar('phone', { length: 20 }).notNull(),         // Requerido para todos
  email: varchar('email', { length: 255 }).unique(),         // Solo owners
  repittCode: varchar('repitt_code', { length: 20 }).notNull().unique(),
  password: varchar('password', { length: 255 }),            // Solo owners
  accountStatusId: integer('account_status_id')
    .references(() => accountStatuses.id)
    .notNull(),
  qrPath: varchar('qr_path', { length: 500 }),
  plan: varchar('plan', { length: 20 }).default('free').notNull(),
  // Billing — agnóstico de proveedor
  billingProvider: varchar('billing_provider', { length: 50 }),       // 'stripe' | 'paddle'
  billingCustomerId: varchar('billing_customer_id', { length: 255 }), // cus_xxx
  pmType: varchar('pm_type', { length: 50 }),                         // 'card' | 'oxxo' | 'spei'
  pmLastFour: varchar('pm_last_four', { length: 4 }),
  trialEndsAt: timestamp('trial_ends_at'),
  hasVerifiedEmail: boolean('has_verified_email').default(false).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  phoneVerifiedAt: timestamp('phone_verified_at'),           // Se llena en primer canje
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
