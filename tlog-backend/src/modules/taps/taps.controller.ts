import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TapsService } from './taps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../users/dto/current-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Taps')
@Controller('tap')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class TapsController {
  constructor(private readonly tapsService: TapsService) {}

  @Post(':roundId')
  @Roles(Role.admin, Role.nikita, Role.survivor)
  // @Throttle({ default: { limit: 20, ttl: 1000 } }) // 20 taps per second
  @ApiOperation({ summary: 'Register a tap/click for a user in a round' })
  async registerTap(
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.tapsService.registerTap(roundId, user.id, user.role);
  }
}
