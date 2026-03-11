import { pgTable, serial, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { businesses } from './businesses.schema';

export const stampCards = pgTable('stamp_cards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  requiredStamps: integer('required_stamps').notNull(),
  requiredHours: integer('required_hours').notNull(), // Cooldown between stamps
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  stampIconPath: varchar('stamp_icon_path', { length: 500 }),
  primaryColor: varchar('primary_color', { length: 50 }),
  businessId: integer('business_id')
    .references(() => businesses.id)
    .notNull(),
  reward: varchar('reward', { length: 255 }),
  isCompleted: boolean('is_completed').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});
