"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const catalogs_schema_1 = require("./catalogs.schema");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    repittCode: (0, pg_core_1.varchar)('repitt_code', { length: 20 }).notNull().unique(),
    password: (0, pg_core_1.varchar)('password', { length: 255 }).notNull(),
    accountStatusId: (0, pg_core_1.integer)('account_status_id')
        .references(() => catalogs_schema_1.accountStatuses.id)
        .notNull(),
    qrPath: (0, pg_core_1.varchar)('qr_path', { length: 500 }),
    hasVerifiedEmail: (0, pg_core_1.boolean)('has_verified_email').default(false).notNull(),
    emailVerifiedAt: (0, pg_core_1.timestamp)('email_verified_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at'),
});
//# sourceMappingURL=users.schema.js.map