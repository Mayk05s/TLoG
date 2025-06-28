import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { RoundsService } from '../rounds/rounds.service';
import { TapResponseDto } from './dto/tap-response.dto';
import { Role, Round } from '@prisma/client';

@Injectable()
export class TapsService {
  private readonly logger = new Logger(TapsService.name);

  constructor(
    private prisma: PrismaService,
    private tapCache: TapCacheService,
    private roundsService: RoundsService,
  ) {}

  async processTap(roundId: string, userId: string, userRole: Role): Promise<TapResponseDto> {
    const round: Round = await this.roundsService.findOne(roundId);

    const isNikita = userRole === Role.nikita;
    await this.tapCache.addDelta(roundId, userId, isNikita, round.endsAt.getTime());

    return { success: true };
  }
}
