"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businesses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
const catalogs_schema_1 = require("./catalogs.schema");
exports.businesses = (0, pg_core_1.pgTable)('businesses', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    address: (0, pg_core_1.text)('address'),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    categoryId: (0, pg_core_1.integer)('category_id')
        .references(() => catalogs_schema_1.categories.id)
        .notNull(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => users_schema_1.users.id)
        .notNull(),
    openingHours: (0, pg_core_1.text)('opening_hours'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    logoPath: (0, pg_core_1.varchar)('logo_path', { length: 500 }),
    qrPath: (0, pg_core_1.varchar)('qr_path', { length: 500 }),
    flyerPath: (0, pg_core_1.varchar)('flyer_path', { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at'),
});
//# sourceMappingURL=businesses.schema.js.map