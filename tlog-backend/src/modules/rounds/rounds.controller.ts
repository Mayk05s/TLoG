import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoundsService } from './rounds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../users/dto/current-user.dto';
import { Role } from '@prisma/client';
import { RoundDto } from './dto/round.dto';
import { RoundWithStatsDto } from './dto/round-with-stats.dto';
import { RoundsQueryDto } from './dto/rounds-query.dto';

@ApiTags('Rounds')
@ApiBearerAuth('access-token')
@Controller('rounds')
@UseGuards(JwtAuthGuard)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Get()
  async getActiveRounds(@Query() query: RoundsQueryDto): Promise<RoundDto[]> {
    return this.roundsService.findAll(query.status);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  async createRound(): Promise<RoundDto> {
    return this.roundsService.create();
  }

  @Get(':id')
  async getRoundWithStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<RoundWithStatsDto> {
    const round = await this.roundsService.findOne(id);
    if (!round) {
      throw new NotFoundException(`Round with ID ${id} not found`);
    }
    return { ...round, userId: user.id };
  }
}
