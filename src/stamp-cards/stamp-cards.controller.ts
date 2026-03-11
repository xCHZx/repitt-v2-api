import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { StampCardsService } from './stamp-cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Requires Guard

@ApiTags('Stamp Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stamp-cards')
export class StampCardsController {
  constructor(private readonly stampCardsService: StampCardsService) {}

  @Get('business/:id')
  @ApiOperation({ summary: 'Get all stamp cards for a specific business' })
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiResponse({ status: 200, description: 'List of stamp cards' })
  getBusinessStampCards(@Param('id') id: string) {
    return this.stampCardsService.getBusinessStampCards(+id);
  }
}

