import { Controller, Get, Param, ParseIntPipe, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get business KPI metrics' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiQuery({ name: 'timePeriod', required: false, enum: ['day', 'week', 'month', 'year'], description: 'Defaults to month' })
  @ApiResponse({ status: 200, description: 'Business metrics' })
  @ApiResponse({ status: 403, description: 'Business not found or access denied' })
  getMetrics(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query('timePeriod') timePeriod: string = 'month',
    @Request() req: any,
  ) {
    return this.metricsService.getMetrics(req.user.id, businessId, timePeriod);
  }
}
