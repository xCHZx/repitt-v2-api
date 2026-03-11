import { VisitsService } from './visits.service';
export declare class ScanDto {
    repittCode: string;
    stampCardId: number;
}
export declare class VisitsController {
    private readonly visitsService;
    constructor(visitsService: VisitsService);
    scanUser(req: any, body: ScanDto): Promise<{
        message: string;
        progress: {
            id: number;
            userId: number;
            stampCardId: number;
            visitsCount: number;
            isActive: boolean;
            isCompleted: boolean;
            isRewardRedeemed: boolean;
            qrPath: string | null;
            completedAt: Date | null;
            redeemedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
