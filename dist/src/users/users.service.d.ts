import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
export declare class UsersService {
    private readonly db;
    constructor(db: PostgresJsDatabase<Record<string, unknown>>);
    findByEmail(email: string): Promise<{
        id: number;
        firstName: string;
        lastName: string;
        phone: string | null;
        email: string;
        repittCode: string;
        password: string;
        accountStatusId: number;
        qrPath: string | null;
        hasVerifiedEmail: boolean;
        emailVerifiedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
