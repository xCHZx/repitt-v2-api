"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitsService = void 0;
const common_1 = require("@nestjs/common");
const postgres_js_1 = require("drizzle-orm/postgres-js");
const drizzle_orm_1 = require("drizzle-orm");
const database_providers_1 = require("../database/database.providers");
const schema_1 = require("../database/schema");
let VisitsService = class VisitsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async scanUser(businessUserId, repittCode, stampCardId) {
        return await this.db.transaction(async (tx) => {
            const [customer] = await tx.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.repittCode, repittCode)).limit(1);
            if (!customer)
                throw new common_1.NotFoundException('User not found');
            const [stampCard] = await tx.select().from(schema_1.stampCards).where((0, drizzle_orm_1.eq)(schema_1.stampCards.id, stampCardId)).limit(1);
            if (!stampCard)
                throw new common_1.NotFoundException('Stamp card not found');
            let [progress] = await tx
                .select()
                .from(schema_1.userStampCards)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userStampCards.userId, customer.id), (0, drizzle_orm_1.eq)(schema_1.userStampCards.stampCardId, stampCard.id)))
                .limit(1);
            if (!progress) {
                const [newProgress] = await tx.insert(schema_1.userStampCards).values({
                    userId: customer.id,
                    stampCardId: stampCard.id,
                    visitsCount: 0,
                }).returning();
                progress = newProgress;
            }
            if (progress.isCompleted) {
                throw new common_1.BadRequestException('Stamp card is already completed');
            }
            const [lastVisit] = await tx
                .select()
                .from(schema_1.visits)
                .where((0, drizzle_orm_1.eq)(schema_1.visits.userStampCardId, progress.id))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.createdAt))
                .limit(1);
            if (lastVisit) {
                const now = new Date();
                const hoursDiff = (now.getTime() - lastVisit.createdAt.getTime()) / (1000 * 60 * 60);
                if (hoursDiff < stampCard.requiredHours) {
                    throw new common_1.BadRequestException(`Wait at least ${stampCard.requiredHours} hours between visits`);
                }
            }
            await tx.insert(schema_1.visits).values({
                userId: customer.id,
                userStampCardId: progress.id,
            });
            const newVisitsCount = progress.visitsCount + 1;
            const isCompleted = newVisitsCount >= stampCard.requiredStamps;
            const [updatedProgress] = await tx.update(schema_1.userStampCards)
                .set({
                visitsCount: newVisitsCount,
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.userStampCards.id, progress.id))
                .returning();
            return {
                message: 'Visit registered successfully',
                progress: updatedProgress,
            };
        });
    }
};
exports.VisitsService = VisitsService;
exports.VisitsService = VisitsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_providers_1.DATABASE_CONNECTION)),
    __metadata("design:paramtypes", [postgres_js_1.PostgresJsDatabase])
], VisitsService);
//# sourceMappingURL=visits.service.js.map