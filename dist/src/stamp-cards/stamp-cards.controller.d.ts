import { StampCardsService } from './stamp-cards.service';
export declare class StampCardsController {
    private readonly stampCardsService;
    constructor(stampCardsService: StampCardsService);
    getBusinessStampCards(id: string): Promise<{
        id: number;
        name: string;
        description: string | null;
        requiredStamps: number;
        requiredHours: number;
        startDate: Date | null;
        endDate: Date | null;
        stampIconPath: string | null;
        primaryColor: string | null;
        businessId: number;
        reward: string | null;
        isCompleted: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
}
