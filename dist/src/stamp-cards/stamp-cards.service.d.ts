import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
export declare class StampCardsService {
    private readonly db;
    constructor(db: PostgresJsDatabase<Record<string, unknown>>);
    getBusinessStampCards(businessId: number): Promise<{
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
