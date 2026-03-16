import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CatalogsService } from './catalogs.service';

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all active categories for businesses' })
  @ApiResponse({ status: 200, description: 'List of active categories.' })
  async getCategories() {
    return this.catalogsService.getCategories();
  }
}
