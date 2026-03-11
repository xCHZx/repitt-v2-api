import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { users, businesses, stampCards, accountStatuses, categories } from '../database/schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('User with that email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    return await this.db.transaction(async (tx) => {
      // 1. Ensure Catalog defaults exist (just for MVP/Testing)
      let defaultStatus = await tx.select().from(accountStatuses).where(eq(accountStatuses.id, 1)).limit(1);
      if (defaultStatus.length === 0) {
        defaultStatus = await tx.insert(accountStatuses).values({ name: 'Active' }).returning();
      }

      let defaultCategory = await tx.select().from(categories).where(eq(categories.id, registerDto.categoryId)).limit(1);
      if (defaultCategory.length === 0) {
        defaultCategory = await tx.insert(categories).values({ name: 'General' }).returning();
      }

      // Generate a simple repitt-code
      const code = `rp-${Math.random().toString(36).substring(2, 8)}`;

      // 2. Create User
      const [newUser] = await tx.insert(users).values({
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email,
        password: hashedPassword,
        phone: registerDto.userPhone,
        repittCode: code,
        accountStatusId: defaultStatus[0].id,
      }).returning();

      // 3. Create Business
      const [newBusiness] = await tx.insert(businesses).values({
        name: registerDto.businessName,
        description: registerDto.businessDescription,
        categoryId: defaultCategory[0].id,
        userId: newUser.id,
      }).returning();

      // 4. Create Initial Default Stamp Card
      const [newStampCard] = await tx.insert(stampCards).values({
        name: 'My Custom Card',
        description: 'Collect 10 stamps to get a free coffee!',
        requiredStamps: 10,
        requiredHours: 24,
        businessId: newBusiness.id,
      }).returning();

      const payload = { email: newUser.email, sub: newUser.id };
      
      return {
        message: 'Onboarding completed successfully',
        access_token: this.jwtService.sign(payload),
        user: newUser,
        business: newBusiness,
        stampCard: newStampCard,
      };
    });
  }
}

