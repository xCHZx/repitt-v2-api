"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseProviders = exports.DATABASE_CONNECTION = void 0;
const config_1 = require("@nestjs/config");
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
exports.DATABASE_CONNECTION = 'DATABASE_CONNECTION';
exports.databaseProviders = [
    {
        provide: exports.DATABASE_CONNECTION,
        useFactory: (configService) => {
            const dbUrl = configService.get('DATABASE_URL');
            if (!dbUrl) {
                throw new Error('DATABASE_URL is not defined in the environment variables');
            }
            const queryClient = (0, postgres_1.default)(dbUrl);
            return (0, postgres_js_1.drizzle)(queryClient);
        },
        inject: [config_1.ConfigService],
    },
];
//# sourceMappingURL=database.providers.js.map