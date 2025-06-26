import { Controller, Get, Param, ParseUUIDPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoundsService } from './rounds.service';
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

@ApiTags('Rounds')
@ApiBearerAuth('JWT-auth')
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
