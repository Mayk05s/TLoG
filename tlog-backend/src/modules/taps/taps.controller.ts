import { Controller, Param, ParseUUIDPipe, Post, Request, UseGuards } from '@nestjs/common';
import { TapsService } from './taps.service';
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

@Controller('tap')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TapsController {
  constructor(private readonly tapsService: TapsService) {}

  @Post(':roundId')
  @Roles(Role.admin, Role.nikita, Role.survivor)
  async registerTap(
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.tapsService.registerTap(roundId, req.user.id, req.user.role);
  }
}
