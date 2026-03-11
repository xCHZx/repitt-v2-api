"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userStampCards = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
const stamp_cards_schema_1 = require("./stamp_cards.schema");
exports.userStampCards = (0, pg_core_1.pgTable)('user_stamp_cards', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => users_schema_1.users.id)
        .notNull(),
    stampCardId: (0, pg_core_1.integer)('stamp_card_id')
        .references(() => stamp_cards_schema_1.stampCards.id)
        .notNull(),
    visitsCount: (0, pg_core_1.integer)('visits_count').default(0).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    isCompleted: (0, pg_core_1.boolean)('is_completed').default(false).notNull(),
    isRewardRedeemed: (0, pg_core_1.boolean)('is_reward_redeemed').default(false).notNull(),
    qrPath: (0, pg_core_1.varchar)('qr_path', { length: 500 }),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    redeemedAt: (0, pg_core_1.timestamp)('redeemed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=user_stamp_cards.schema.js.map