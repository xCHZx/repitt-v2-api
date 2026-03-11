import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: any;
    }>;
    register(registerDto: RegisterDto): Promise<{
        message: string;
        access_token: string;
        user: {
            password: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            firstName: string;
            lastName: string;
            phone: string | null;
            email: string;
            repittCode: string;
            accountStatusId: number;
            qrPath: string | null;
            hasVerifiedEmail: boolean;
            emailVerifiedAt: Date | null;
            deletedAt: Date | null;
        };
        business: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            qrPath: string | null;
            deletedAt: Date | null;
            description: string | null;
            address: string | null;
            categoryId: number;
            userId: number;
            openingHours: string | null;
            isActive: boolean;
            logoPath: string | null;
            flyerPath: string | null;
        };
        stampCard: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            description: string | null;
            isActive: boolean;
            requiredStamps: number;
            requiredHours: number;
            startDate: Date | null;
            endDate: Date | null;
            stampIconPath: string | null;
            primaryColor: string | null;
            businessId: number;
            reward: string | null;
            isCompleted: boolean;
        };
    }>;
}
