import { Controller, Get, Param, ParseUUIDPipe, Request, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';

interface RequestWithUser extends FastifyRequest {
  user: {
    id: string;
    username: string;
    role: Role;
  };
}

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('rounds/:id')
  @Roles(Role.admin, Role.nikita, Role.survivor)
  async getRoundStats(
    @Param('id', ParseUUIDPipe) roundId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.statsService.getRoundStats(roundId, req.user.id);
  }
}
