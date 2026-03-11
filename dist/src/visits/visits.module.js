"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitsModule = void 0;
const common_1 = require("@nestjs/common");
const visits_service_1 = require("./visits.service");
const visits_controller_1 = require("./visits.controller");
let VisitsModule = class VisitsModule {
};
exports.VisitsModule = VisitsModule;
exports.VisitsModule = VisitsModule = __decorate([
    (0, common_1.Module)({
        providers: [visits_service_1.VisitsService],
        controllers: [visits_controller_1.VisitsController]
    })
], VisitsModule);
//# sourceMappingURL=visits.module.js.map