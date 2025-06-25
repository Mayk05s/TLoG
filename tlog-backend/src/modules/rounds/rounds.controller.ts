import { Controller, Get, Post, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';

interface RequestWithUser extends FastifyRequest {
  user: {
    id: string;
    username: string;
    role: Role;
  };
}

@Controller('rounds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Get()
  @Roles(Role.admin, Role.nikita, Role.survivor)
  async getActiveRounds() {
    return this.roundsService.findAll();
  }

  @Post()
  @Roles(Role.admin)
  async createRound() {
    return this.roundsService.create();
  }

  @Get(':id')
  @Roles(Role.admin, Role.nikita, Role.survivor)
  async getRoundWithStats(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser) {
    const round = await this.roundsService.findOne(id);
    // Replace with your StatsService implementation when available
    return { ...round, userId: req.user.id };
  }
}
