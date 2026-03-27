import { Body, Controller, Get, Param, ParseIntPipe, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the profile of the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@Request() req: { user: { id: number; email: string; role: string } }) {
    return this.usersService.findMe(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the profile of the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the updated user profile.' })
  @ApiResponse({ status: 400, description: 'No fields provided or invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateMe(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Get('me/visits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get visit history for the authenticated visitor' })
  @ApiResponse({ status: 200, description: 'Total visit count and list of visits with stamp card and business info.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyVisits(@Request() req: any) {
    return this.usersService.getMyVisits(req.user.id);
  }

  @Get('me/stamp-cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stamp cards for the authenticated visitor' })
  @ApiResponse({ status: 200, description: 'List of user stamp cards with stamp card and business info.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyStampCards(@Request() req: any) {
    return this.usersService.getMyStampCards(req.user.id);
  }

  @Get('me/stamp-cards/:userStampCardId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single user stamp card with visits' })
  @ApiParam({ name: 'userStampCardId', description: 'User Stamp Card ID' })
  @ApiResponse({ status: 200, description: 'User stamp card detail with visits list.' })
  @ApiResponse({ status: 404, description: 'Stamp card not found.' })
  findMyStampCard(
    @Param('userStampCardId', ParseIntPipe) userStampCardId: number,
    @Request() req: any,
  ) {
    return this.usersService.findMyStampCard(req.user.id, userStampCardId);
  }
}
