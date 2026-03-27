import { Controller, Get, Param, ParseIntPipe, Request, UseGuards, Patch, Body, Post, UseInterceptors, UploadedFile, ParseFilePipeBuilder, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessesService } from './businesses.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateBusinessDto } from './dto/create-business.dto';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new business for the authenticated owner' })
  @ApiResponse({ status: 201, description: 'Business created. Returns the full business profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createBusiness(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businessesService.create(req.user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all businesses managed by the authenticated owner' })
  @ApiResponse({ status: 200, description: 'Returns the list of businesses with their stamp cards.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyBusinesses(@Request() req: { user: { id: number } }) {
    return this.businessesService.findMyBusinesses(req.user.id);
  }

  @Get(':repittCode')
  @ApiOperation({ summary: 'Get a public business profile by its Repitt Code' })
  @ApiParam({ name: 'repittCode', description: 'Business Repitt Code', type: String })
  @ApiResponse({ status: 200, description: 'Returns the business profile with category and stamp cards.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  getBusinessByRepittCode(@Param('repittCode') repittCode: string) {
    return this.businessesService.findByRepittCode(repittCode);
  }

  @Get(':businessId/user-stamp-cards/pending-redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all completed stamp cards pending reward redemption (owner only)' })
  @ApiParam({ name: 'businessId', description: 'Business ID', type: Number })
  @ApiResponse({ status: 200, description: 'List of completed user stamp cards not yet redeemed.' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied.' })
  getPendingRedeem(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
  ) {
    return this.businessesService.getPendingRedeem(req.user.id, businessId);
  }

  @Post(':businessId/user-stamp-cards/:userStampCardId/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem a completed stamp card reward (owner only)' })
  @ApiParam({ name: 'businessId', description: 'Business ID', type: Number })
  @ApiParam({ name: 'userStampCardId', description: 'User Stamp Card ID', type: Number })
  @ApiResponse({ status: 201, description: 'Reward redeemed successfully.' })
  @ApiResponse({ status: 400, description: 'Stamp card not completed or already redeemed.' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied.' })
  @ApiResponse({ status: 404, description: 'User stamp card not found.' })
  redeemReward(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('userStampCardId', ParseIntPipe) userStampCardId: number,
  ) {
    return this.businessesService.redeemReward(req.user.id, businessId, userStampCardId);
  }

  @Get(':businessId/user-stamp-cards/:userStampCardId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a customer's stamp card detail within a business (owner only)" })
  @ApiParam({ name: 'businessId', description: 'Business ID', type: Number })
  @ApiParam({ name: 'userStampCardId', description: 'User Stamp Card ID', type: Number })
  @ApiResponse({ status: 200, description: 'User stamp card detail with visits.' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied.' })
  @ApiResponse({ status: 404, description: 'User stamp card not found.' })
  getUserStampCard(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('userStampCardId', ParseIntPipe) userStampCardId: number,
  ) {
    return this.businessesService.findUserStampCard(req.user.id, businessId, userStampCardId);
  }

  @Get(':businessId/customers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all customers of a business (owner CRM view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID', type: Number })
  @ApiResponse({ status: 200, description: 'List of customers with visit stats and active stamp cards.' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied.' })
  getCustomers(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
  ) {
    return this.businessesService.getCustomers(req.user.id, businessId);
  }

  @Get(':businessId/customers/:customerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single customer detail within a business (owner view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID', type: Number })
  @ApiParam({ name: 'customerId', description: 'User ID of the customer', type: Number })
  @ApiResponse({ status: 200, description: 'Customer profile with full stamp card cycle history.' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied.' })
  @ApiResponse({ status: 404, description: 'Customer not found in this business.' })
  getCustomer(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    return this.businessesService.getCustomer(req.user.id, businessId, customerId);
  }

  @Patch(':businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a business profile' })
  @ApiParam({ name: 'businessId', description: 'Business ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns the updated business profile.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User does not own this business.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  updateBusiness(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() updateDto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(req.user.id, businessId, updateDto);
  }

  @Post(':businessId/logo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and update the business logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({ name: 'businessId', description: 'Business ID', type: Number })
  @ApiResponse({ status: 201, description: 'Logo uploaded and profile updated' })
  @ApiResponse({ status: 400, description: 'File must be an image' })
  @ApiResponse({ status: 403, description: 'Forbidden. User does not own this business.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async uploadLogo(
    @Request() req: { user: { id: number } },
    @Param('businessId', ParseIntPipe) businessId: number,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|gif|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024, // 2MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    ) file: Express.Multer.File,
  ) {
    // Validation is now handled automatically by ParseFilePipeBuilder

    // 1. First ensure business exists and user is owner before uploading to bucket
    await this.businessesService.update(req.user.id, businessId, {}); // Pass empty update just to verify ownership

    // 2. Upload file to Supabase logic
    const path = `business-logos/biz-${businessId}`;
    const publicUrl = await this.supabaseService.uploadImage(file, path);

    // 3. Update the logoPath on DB
    return this.businessesService.update(req.user.id, businessId, { logoPath: publicUrl });
  }
}

