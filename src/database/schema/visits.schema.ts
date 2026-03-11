import { pgTable, serial, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { userStampCards } from './user_stamp_cards.schema';

export const visits = pgTable('visits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  userStampCardId: integer('user_stamp_card_id')
    .references(() => userStampCards.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
