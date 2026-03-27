import { BadRequestException, Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ParseFilePipeBuilder } from '@nestjs/common';

const ALLOWED_ICON_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateStampCardDto } from './dto/create-stamp-card.dto';
import { UpdateStampCardDto } from './dto/update-stamp-card.dto';
import { StampCardsService } from './stamp-cards.service';

@ApiTags('Stamp Cards')
@Controller('businesses/:businessId/stamp-cards')
export class StampCardsController {
  constructor(
    private readonly stampCardsService: StampCardsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Static routes first — Express matches in declaration order
  @Get()
  @ApiOperation({ summary: 'Get active stamp cards for a business (public view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'List of active stamp cards' })
  getBusinessStampCards(@Param('businessId', ParseIntPipe) businessId: number) {
    return this.stampCardsService.getBusinessStampCards(businessId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stamp cards for owned business (owner view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'List of all stamp cards including inactive' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  getMyBusinessStampCards(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Request() req: any,
  ) {
    return this.stampCardsService.getMyBusinessStampCards(businessId, req.user.id);
  }

  // Dynamic routes after static ones
  @Get(':stampCardId/visits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all visits for a stamp card (owner view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'stampCardId', description: 'Stamp Card ID' })
  @ApiResponse({ status: 200, description: 'Total visits and list with customer info' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied' })
  @ApiResponse({ status: 404, description: 'Stamp card not found' })
  getStampCardVisits(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('stampCardId', ParseIntPipe) stampCardId: number,
    @Request() req: any,
  ) {
    return this.stampCardsService.getStampCardVisits(req.user.id, businessId, stampCardId);
  }

  @Get(':stampCardId')
  @ApiOperation({ summary: 'Get a single stamp card by ID (public view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'stampCardId', description: 'Stamp Card ID' })
  @ApiResponse({ status: 200, description: 'Stamp card details' })
  @ApiResponse({ status: 404, description: 'Stamp card not found' })
  findOne(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('stampCardId', ParseIntPipe) stampCardId: number,
  ) {
    return this.stampCardsService.findOne(businessId, stampCardId);
  }

  @Get(':stampCardId/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single stamp card (owner view)' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'stampCardId', description: 'Stamp Card ID' })
  @ApiResponse({ status: 200, description: 'Stamp card details' })
  @ApiResponse({ status: 404, description: 'Business or stamp card not found' })
  findOneOwner(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('stampCardId', ParseIntPipe) stampCardId: number,
    @Request() req: any,
  ) {
    return this.stampCardsService.findOneOwner(businessId, stampCardId, req.user.id);
  }

  @Patch(':stampCardId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a stamp card (owner)' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'stampCardId', description: 'Stamp Card ID' })
  @ApiResponse({ status: 200, description: 'Updated stamp card' })
  @ApiResponse({ status: 404, description: 'Business or stamp card not found' })
  update(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('stampCardId', ParseIntPipe) stampCardId: number,
    @Body() dto: UpdateStampCardDto,
    @Request() req: any,
  ) {
    return this.stampCardsService.update(req.user.id, businessId, stampCardId, dto);
  }

  @Post(':stampCardId/icon')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('stamp_icon_file'))
  @ApiOperation({ summary: 'Upload stamp icon for a stamp card' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { stamp_icon_file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'stampCardId', description: 'Stamp Card ID' })
  @ApiResponse({ status: 201, description: 'Icon uploaded and stamp card updated' })
  @ApiResponse({ status: 404, description: 'Business or stamp card not found' })
  async uploadIcon(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Param('stampCardId', ParseIntPipe) stampCardId: number,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 2 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!ALLOWED_ICON_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Se aceptan: jpg, png, gif, webp, svg');
    }
    const path = `stamp-icons/card-${stampCardId}`;
    const publicUrl = await this.supabaseService.uploadImage(file, path);
    return this.stampCardsService.updateIconPath(req.user.id, businessId, stampCardId, publicUrl);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a stamp card for an owned business' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiResponse({ status: 201, description: 'Stamp card created' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied' })
  create(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: CreateStampCardDto,
    @Request() req: any,
  ) {
    return this.stampCardsService.create(req.user.id, businessId, dto);
  }
}
