import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { TapsService } from './taps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../users/dto/current-user.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('tap')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TapsController {
  constructor(private readonly tapsService: TapsService) {}

  @Post(':roundId')
  @Roles(Role.admin, Role.nikita, Role.survivor)
  async registerTap(
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.tapsService.registerTap(roundId, user.id, user.role);
  }
}
