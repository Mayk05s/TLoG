import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoundsService } from './rounds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../users/dto/current-user.dto';
import { RoundDetailsDto, RoundDto, RoundsQueryDto } from './dto';

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
  async createRound(): Promise<RoundDto> {
    return this.roundsService.create();
  }

  @Get(':roundId')
  async getRoundWithStats(
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<RoundDetailsDto> {
    return this.roundsService.roundStats(roundId, user.id);
  }
}
