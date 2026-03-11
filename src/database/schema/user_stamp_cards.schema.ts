import { pgTable, serial, timestamp, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { stampCards } from './stamp_cards.schema';

export const userStampCards = pgTable('user_stamp_cards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  stampCardId: integer('stamp_card_id')
    .references(() => stampCards.id)
    .notNull(),
  visitsCount: integer('visits_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  isRewardRedeemed: boolean('is_reward_redeemed').default(false).notNull(),
  qrPath: varchar('qr_path', { length: 500 }),
  completedAt: timestamp('completed_at'),
  redeemedAt: timestamp('redeemed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
