import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // I'll create this file next

export class ScanDto {
  repittCode!: string;
  stampCardId!: number;
}

@ApiTags('Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Register a visit by scanning a user QR (Repitt Code)' })
  @ApiResponse({ status: 201, description: 'Visit correctly registered' })
  @ApiResponse({ status: 400, description: 'Cooldown restricted or already completed' })
  scanUser(@Request() req: any, @Body() body: ScanDto) {
    // req.user has the authenticated business user id
    return this.visitsService.scanUser(req.user.id, body.repittCode, body.stampCardId);
  }
}

