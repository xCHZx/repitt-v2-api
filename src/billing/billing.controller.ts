import { Body, Controller, Get, Headers, HttpCode, Param, ParseIntPipe, Post, Req, Request, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { BusinessActionDto } from './dto/business-action.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout session for a business' })
  @ApiResponse({ status: 201, description: 'Returns Stripe Checkout URL.' })
  createCheckout(
    @Request() req: { user: { id: number; email: string } },
    @Body() body: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(req.user.id, req.user.email, body.businessId, body.planId);
  }

  @Get('business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription status for a specific business' })
  @ApiResponse({ status: 200, description: 'Returns the active subscription or null.' })
  getSubscription(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
  ) {
    return this.billingService.getSubscription(req.user.id, businessId);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Create Stripe Customer Portal session for a business' })
  @ApiResponse({ status: 200, description: 'Returns Stripe Customer Portal URL.' })
  createPortal(
    @Request() req: { user: { id: number } },
    @Body() body: BusinessActionDto,
  ) {
    return this.billingService.createPortalSession(req.user.id, body.businessId);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription for a business at end of billing period' })
  @ApiResponse({ status: 201, description: 'Subscription scheduled for cancellation.' })
  cancelSubscription(
    @Request() req: { user: { id: number } },
    @Body() body: BusinessActionDto,
  ) {
    return this.billingService.cancelSubscription(req.user.id, body.businessId);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody!, signature);
  }
}
