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
exports.StampCardsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const stamp_cards_service_1 = require("./stamp-cards.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let StampCardsController = class StampCardsController {
    stampCardsService;
    constructor(stampCardsService) {
        this.stampCardsService = stampCardsService;
    }
    getBusinessStampCards(id) {
        return this.stampCardsService.getBusinessStampCards(+id);
    }
};
exports.StampCardsController = StampCardsController;
__decorate([
    (0, common_1.Get)('business/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all stamp cards for a specific business' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Business ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of stamp cards' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StampCardsController.prototype, "getBusinessStampCards", null);
exports.StampCardsController = StampCardsController = __decorate([
    (0, swagger_1.ApiTags)('Stamp Cards'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('stamp-cards'),
    __metadata("design:paramtypes", [stamp_cards_service_1.StampCardsService])
], StampCardsController);
//# sourceMappingURL=stamp-cards.controller.js.map