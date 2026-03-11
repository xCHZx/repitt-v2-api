"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stampCards = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const businesses_schema_1 = require("./businesses.schema");
exports.stampCards = (0, pg_core_1.pgTable)('stamp_cards', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    requiredStamps: (0, pg_core_1.integer)('required_stamps').notNull(),
    requiredHours: (0, pg_core_1.integer)('required_hours').notNull(),
    startDate: (0, pg_core_1.timestamp)('start_date'),
    endDate: (0, pg_core_1.timestamp)('end_date'),
    stampIconPath: (0, pg_core_1.varchar)('stamp_icon_path', { length: 500 }),
    primaryColor: (0, pg_core_1.varchar)('primary_color', { length: 50 }),
    businessId: (0, pg_core_1.integer)('business_id')
        .references(() => businesses_schema_1.businesses.id)
        .notNull(),
    reward: (0, pg_core_1.varchar)('reward', { length: 255 }),
    isCompleted: (0, pg_core_1.boolean)('is_completed').default(false).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at'),
});
//# sourceMappingURL=stamp_cards.schema.js.map