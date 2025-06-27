import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../users/dto/current-user.dto';

@ApiBearerAuth('access-token')
@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('rounds/:id')
  @Roles(Role.admin, Role.nikita, Role.survivor)
  async getRoundStats(
    @Param('id', ParseUUIDPipe) roundId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.statsService.roundStats(roundId);
  }
}
