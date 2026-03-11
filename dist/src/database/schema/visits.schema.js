"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visits = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
const user_stamp_cards_schema_1 = require("./user_stamp_cards.schema");
exports.visits = (0, pg_core_1.pgTable)('visits', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => users_schema_1.users.id)
        .notNull(),
    userStampCardId: (0, pg_core_1.integer)('user_stamp_card_id')
        .references(() => user_stamp_cards_schema_1.userStampCards.id)
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=visits.schema.js.map