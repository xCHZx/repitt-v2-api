import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.providers';
import { users, businesses, stampCards, accountStatuses, categories, passwordResetTokens } from '../database/schema';
import { generateRepittCode } from '../common/utils/code-generator.util';
import { LoginDto } from './dto/login.dto';
import { LoginVisitorDto } from './dto/login-visitor.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterVisitorDto } from './dto/register-visitor.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';
import * as QRCode from 'qrcode';
import { SupabaseService } from '../supabase/supabase.service';
import { FlyerService } from '../flyer/flyer.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<Record<string, unknown>>,
    private readonly supabaseService: SupabaseService,
    private readonly flyerService: FlyerService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const bizResult = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(and(eq(businesses.userId, user.id), isNull(businesses.deletedAt)))
      .limit(1);
    const role = bizResult.length > 0 ? 'Owner' : 'Visitor';
    const payload = { sub: user.id, role, email: user.email };

    return {
      token: this.jwtService.sign(payload),
      role,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
      },
    };
  }

  async registerOwner(dto: RegisterOwnerDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con ese correo');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return await this.db.transaction(async (tx) => {
      let defaultStatus = await tx.select().from(accountStatuses).where(eq(accountStatuses.id, 1)).limit(1);
      if (defaultStatus.length === 0) {
        defaultStatus = await tx.insert(accountStatuses).values({ name: 'Active' }).returning();
      }

      const userRepittCode = generateRepittCode();
      const userQrBuffer = await QRCode.toBuffer(userRepittCode, {
        type: 'png', margin: 1, width: 1000,
        color: { dark: '#000000ff', light: '#ffffffff' },
      });
      const userQrUrl = await this.supabaseService.uploadBuffer(
        userQrBuffer, 'image/png', `qr-users/usr-${userRepittCode}`,
      );

      const [newUser] = await tx.insert(users).values({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        repittCode: userRepittCode,
        qrPath: userQrUrl,
        accountStatusId: defaultStatus[0].id,
      }).returning();

      let newBusiness = null;
      let newStampCard = null;

      if (dto.businessName) {
        const catId = dto.categoryId || 26;
        let targetCategory = await tx.select().from(categories).where(eq(categories.id, catId)).limit(1);
        if (targetCategory.length === 0) {
          targetCategory = await tx.insert(categories).values({ name: 'General' }).returning();
        }

        const bizRepittCode = generateRepittCode();
        const siteUrl = this.configService.get<string>('SITE_URL') || 'https://repitt.com';
        const bizPublicUrl = `${siteUrl}/visitante/negocios/${bizRepittCode}`;
        const bizQrBuffer = await QRCode.toBuffer(bizPublicUrl, {
          type: 'png', margin: 1, width: 1000,
          color: { dark: '#000000ff', light: '#ffffffff' },
        });
        const bizQrUrl = await this.supabaseService.uploadBuffer(
          bizQrBuffer, 'image/png', `qr-businesses/biz-${bizRepittCode}`,
        );
        const flyerUrl = await this.flyerService.generateFlyer(bizRepittCode, bizQrBuffer);

        const [createdBusiness] = await tx.insert(businesses).values({
          name: dto.businessName,
          description: dto.businessDescription,
          categoryId: targetCategory[0].id,
          userId: newUser.id,
          repittCode: bizRepittCode,
          qrPath: bizQrUrl,
          flyerPath: flyerUrl,
        }).returning();

        newBusiness = createdBusiness;

        const [createdStampCard] = await tx.insert(stampCards).values({
          name: 'My Custom Card',
          description: 'Collect 10 stamps to get a free coffee!',
          requiredStamps: 10,
          requiredHours: 24,
          businessId: newBusiness.id,
          isActive: false,
        }).returning();

        newStampCard = createdStampCard;
      }

      const role = newBusiness ? 'Owner' : 'Visitor';
      const payload = { sub: newUser.id, role, email: newUser.email };

      const response: any = {
        token: this.jwtService.sign(payload),
        role,
        data: {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          phone: newUser.phone,
          plan: newUser.plan,
        },
      };

      if (newBusiness) {
        response.data.business = newBusiness;
        response.data.stampCard = newStampCard;

        this.mailService.sendWelcomeOwner({
          to: newUser.email!,
          firstName: newUser.firstName,
          businessName: newBusiness.name,
          flyerUrl: newBusiness.flyerPath ?? undefined,
        }).catch(() => {});
      }

      return response;
    });
  }

  async loginVisitor(dto: LoginVisitorDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Teléfono no registrado');
    }
    const payload = { sub: user.id, role: 'Visitor', phone: user.phone };
    return {
      token: this.jwtService.sign(payload),
      role: 'Visitor',
      data: {
        firstName: user.firstName,
        phone: user.phone,
        plan: user.plan,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Respuesta genérica — no revelar si el email existe o no
    if (!user || !user.email) {
      return { message: 'If that email is registered, you will receive a reset link shortly.' };
    }

    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Invalidar tokens previos del usuario
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      token: hashedToken,
      expiresAt,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'https://repitt.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${plainToken}`;

    this.mailService.sendPasswordReset({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
    }).catch(() => {});

    return { message: 'If that email is registered, you will receive a reset link shortly.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    const [record] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, hashedToken),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      throw new BadRequestException('Token de recuperación inválido o expirado.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.db.transaction(async (tx) => {
      await tx.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, record.userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, record.id));
    });

    return { message: 'Password updated successfully.' };
  }

  async registerVisitor(dto: RegisterVisitorDto) {
    const existingUser = await this.usersService.findByPhone(dto.phone);
    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con ese teléfono');
    }

    return await this.db.transaction(async (tx) => {
      let defaultStatus = await tx.select().from(accountStatuses).where(eq(accountStatuses.id, 1)).limit(1);
      if (defaultStatus.length === 0) {
        defaultStatus = await tx.insert(accountStatuses).values({ name: 'Active' }).returning();
      }

      const userRepittCode = generateRepittCode();
      const userQrBuffer = await QRCode.toBuffer(userRepittCode, {
        type: 'png', margin: 1, width: 1000,
        color: { dark: '#000000ff', light: '#ffffffff' },
      });
      const userQrUrl = await this.supabaseService.uploadBuffer(
        userQrBuffer, 'image/png', `qr-users/usr-${userRepittCode}`,
      );

      const [newUser] = await tx.insert(users).values({
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        repittCode: userRepittCode,
        qrPath: userQrUrl,
        accountStatusId: defaultStatus[0].id,
      }).returning();

      const payload = { sub: newUser.id, role: 'Visitor', phone: newUser.phone };

      return {
        token: this.jwtService.sign(payload),
        role: 'Visitor',
        data: {
          firstName: newUser.firstName,
          phone: newUser.phone,
          plan: newUser.plan,
        },
      };
    });
  }
}
