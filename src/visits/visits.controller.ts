import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { ScanDto } from './dto/scan.dto';
import { VisitsService } from './visits.service';

@ApiTags('Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all visits for a business (owner view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'Total visits and list with stamp card and customer info' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied' })
  getBusinessVisits(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Request() req: any,
  ) {
    return this.visitsService.getBusinessVisits(req.user.id, businessId);
  }

  @Post('register-customer')
  @ApiOperation({
    summary: 'Register a new customer and log their first visit in one step',
    description: 'Creates the user account if the phone is not registered (upsert). Always creates userStampCard and registers the first visit in a single transaction.',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiBody({ type: RegisterCustomerDto })
  @ApiResponse({ status: 201, description: 'Customer registered and first visit logged. isNew=true if account was created.' })
  @ApiResponse({ status: 400, description: 'Cooldown active, stamp card completed, or cycles exhausted' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied' })
  @ApiResponse({ status: 404, description: 'Stamp card not found' })
  registerCustomer(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Request() req: any,
    @Body() body: RegisterCustomerDto,
  ) {
    return this.visitsService.registerCustomer(req.user.id, businessId, body);
  }

  @Post('scan')
  @ApiOperation({
    summary: 'Register a visit by scanning a QR code',
    description: 'Flow 1: send userRepittCode + stampCardId. Flow 2: send userStampCardRepittCode alone.',
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiBody({ type: ScanDto })
  @ApiResponse({ status: 201, description: 'Visit registered successfully' })
  @ApiResponse({ status: 400, description: 'Cooldown active, already completed, or missing required fields' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied' })
  @ApiResponse({ status: 404, description: 'User or stamp card not found' })
  scan(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Request() req: any,
    @Body() body: ScanDto,
  ) {
    if (body.userStampCardRepittCode) {
      return this.visitsService.scanByUserStampCard(req.user.id, businessId, body.userStampCardRepittCode);
    }

    if (body.userRepittCode && body.stampCardId) {
      return this.visitsService.scanUser(req.user.id, businessId, body.userRepittCode, body.stampCardId);
    }

    if (body.phone && body.stampCardId) {
      return this.visitsService.scanByPhone(req.user.id, businessId, body.phone, body.stampCardId);
    }

    throw new BadRequestException(
      'Debes proporcionar userStampCardRepittCode, userRepittCode + stampCardId, o phone + stampCardId',
    );
  }
}
