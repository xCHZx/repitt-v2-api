"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const postgres_js_1 = require("drizzle-orm/postgres-js");
const drizzle_orm_1 = require("drizzle-orm");
const database_providers_1 = require("../database/database.providers");
const schema_1 = require("../database/schema");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    jwtService;
    usersService;
    db;
    constructor(jwtService, usersService, db) {
        this.jwtService = jwtService;
        this.usersService = usersService;
        this.db = db;
    }
    async validateUser(email, pass) {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }
    async register(registerDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new common_1.BadRequestException('User with that email already exists');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        return await this.db.transaction(async (tx) => {
            let defaultStatus = await tx.select().from(schema_1.accountStatuses).where((0, drizzle_orm_1.eq)(schema_1.accountStatuses.id, 1)).limit(1);
            if (defaultStatus.length === 0) {
                defaultStatus = await tx.insert(schema_1.accountStatuses).values({ name: 'Active' }).returning();
            }
            let defaultCategory = await tx.select().from(schema_1.categories).where((0, drizzle_orm_1.eq)(schema_1.categories.id, registerDto.categoryId)).limit(1);
            if (defaultCategory.length === 0) {
                defaultCategory = await tx.insert(schema_1.categories).values({ name: 'General' }).returning();
            }
            const code = `rp-${Math.random().toString(36).substring(2, 8)}`;
            const [newUser] = await tx.insert(schema_1.users).values({
                firstName: registerDto.firstName,
                lastName: registerDto.lastName,
                email: registerDto.email,
                password: hashedPassword,
                phone: registerDto.userPhone,
                repittCode: code,
                accountStatusId: defaultStatus[0].id,
            }).returning();
            const [newBusiness] = await tx.insert(schema_1.businesses).values({
                name: registerDto.businessName,
                description: registerDto.businessDescription,
                categoryId: defaultCategory[0].id,
                userId: newUser.id,
            }).returning();
            const [newStampCard] = await tx.insert(schema_1.stampCards).values({
                name: 'My Custom Card',
                description: 'Collect 10 stamps to get a free coffee!',
                requiredStamps: 10,
                requiredHours: 24,
                businessId: newBusiness.id,
            }).returning();
            const payload = { email: newUser.email, sub: newUser.id };
            return {
                message: 'Onboarding completed successfully',
                access_token: this.jwtService.sign(payload),
                user: newUser,
                business: newBusiness,
                stampCard: newStampCard,
            };
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(database_providers_1.DATABASE_CONNECTION)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        users_service_1.UsersService,
        postgres_js_1.PostgresJsDatabase])
], AuthService);
//# sourceMappingURL=auth.service.js.map