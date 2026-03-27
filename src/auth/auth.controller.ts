import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginVisitorDto } from './dto/login-visitor.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterVisitorDto } from './dto/register-visitor.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Owner login with email and password' })
  @ApiResponse({ status: 200, description: 'Return JWT token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Owner onboarding — creates user + optional business' })
  @ApiResponse({ status: 201, description: 'Owner created with optional business and stamp card.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  registerOwner(@Body() dto: RegisterOwnerDto) {
    return this.authService.registerOwner(dto);
  }

  @Post('visitor/register')
  @ApiOperation({ summary: 'Visitor registration — firstName + phone only, no password' })
  @ApiResponse({ status: 201, description: 'Visitor created and JWT returned.' })
  @ApiResponse({ status: 400, description: 'Phone already registered.' })
  registerVisitor(@Body() dto: RegisterVisitorDto) {
    return this.authService.registerVisitor(dto);
  }

  @Post('visitor/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Visitor login — phone number, JWT inmediato' })
  @ApiResponse({ status: 200, description: 'JWT returned.' })
  @ApiResponse({ status: 401, description: 'Phone not registered.' })
  loginVisitor(@Body() dto: LoginVisitorDto) {
    return this.authService.loginVisitor(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset — owners only. Sends email with reset link.' })
  @ApiResponse({ status: 200, description: 'Generic response regardless of whether email exists.' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email. Token expires in 1 hour.' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — invalidate session on the client side' })
  logout() {
    return { message: 'Logged out successfully' };
  }
}
