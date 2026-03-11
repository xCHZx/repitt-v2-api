import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
export declare class VisitsService {
    private readonly db;
    constructor(db: PostgresJsDatabase<Record<string, unknown>>);
    scanUser(businessUserId: number, repittCode: string, stampCardId: number): Promise<{
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
