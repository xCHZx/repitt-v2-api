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
exports.VisitsController = exports.ScanDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const visits_service_1 = require("./visits.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
class ScanDto {
    repittCode;
    stampCardId;
}
exports.ScanDto = ScanDto;
let VisitsController = class VisitsController {
    visitsService;
    constructor(visitsService) {
        this.visitsService = visitsService;
    }
    scanUser(req, body) {
        return this.visitsService.scanUser(req.user.id, body.repittCode, body.stampCardId);
    }
};
exports.VisitsController = VisitsController;
__decorate([
    (0, common_1.Post)('scan'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a visit by scanning a user QR (Repitt Code)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Visit correctly registered' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cooldown restricted or already completed' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ScanDto]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "scanUser", null);
exports.VisitsController = VisitsController = __decorate([
    (0, swagger_1.ApiTags)('Visits'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('visits'),
    __metadata("design:paramtypes", [visits_service_1.VisitsService])
], VisitsController);
//# sourceMappingURL=visits.controller.js.map