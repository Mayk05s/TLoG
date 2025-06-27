import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { TapsService } from './taps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../users/dto/current-user.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TapResponseDto } from './dto/tap-response.dto';
import { StatsResponseDto } from './dto/stats-response.dto';

@ApiTags('Taps')
@Controller()
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TapsController {
  constructor(private readonly tapsService: TapsService) {}

  @Post('tap/:roundId')
  @HttpCode(200)
  @Roles(Role.admin, Role.nikita, Role.survivor)
  @ApiOperation({ summary: 'Register a tap/click for a user in a round' })
  @ApiResponse({ status: 200, description: 'Tap processed successfully', type: TapResponseDto })
  async tap(
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<TapResponseDto> {
    return this.tapsService.processTap(roundId, user.id, user.role);
  }

  @Get('stats/:roundId')
  @HttpCode(200)
  @Roles(Role.admin, Role.nikita, Role.survivor)
  @ApiOperation({ summary: 'Get player statistics and leaderboard for a round' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: StatsResponseDto,
  })
  async getStats(
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<StatsResponseDto> {
    return this.tapsService.getStats(roundId, user.id);
  }
}
