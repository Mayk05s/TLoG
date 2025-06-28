import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TapCacheService } from '../../cache/tap-cache.service';
import { PlayerStatsService } from './player-stats.service';
import { LeaderboardEntryDto, RoundDetailsDto, RoundDto, RoundStatsDto } from './dto';
import { RoundStatus } from './enums/round-status.enum';
import { Round } from '@prisma/client';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tapCache: TapCacheService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  async findAll(status?: RoundStatus): Promise<RoundDto[]> {
    const now = new Date();

    let whereClause = {};

    if (status === RoundStatus.ACTIVE) {
      whereClause = {
        AND: [{ startsAt: { lte: now } }, { endsAt: { gte: now } }],
      };
    } else if (status === RoundStatus.UPCOMING) {
      whereClause = {
        startsAt: { gt: now },
      };
    } else if (status === RoundStatus.COMPLETED) {
      whereClause = {
        endsAt: { lt: now },
      };
    }

    const rounds = await this.prisma.round.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return rounds.map(round => new RoundDto(round));
  }

  async findOne(roundId: string): Promise<Round> {
    const round: Round | null = await this.prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    return round;
  }

  async isRoundActive(roundId: string): Promise<void> {
    const round: Round = await this.findOne(roundId);

    const now = new Date();
    if (now < round.startsAt || now > round.endsAt) {
      throw new ConflictException('Round is not active');
    }
  }

  async create(): Promise<RoundDto> {
    const { roundDuration, cooldownDuration } = this.configService;

    const now = new Date();
    const startsAt = new Date(now.getTime() + cooldownDuration * 1000);
    const endsAt = new Date(startsAt.getTime() + roundDuration * 1000);

    const round = await this.prisma.round.create({
      data: {
        startsAt: startsAt,
        endsAt: endsAt,
      },
    });

    return new RoundDto(round);
  }

  async roundStats(roundId: string, userId: string): Promise<RoundDetailsDto> {
    const round: Round = await this.findOne(roundId);

    const now = new Date();
    const isRoundEnd = now > round.endsAt;

    let { playerPoints, totalPoints, leaderboard } =
      await this.playerStatsService.getStatsFromCache(roundId, userId);

    const hasRoundInCache = leaderboard.length > 0;
    if (!hasRoundInCache) {
      [playerPoints, totalPoints, leaderboard] = await Promise.all([
        this.playerStatsService.getPlayerPoints(roundId, userId),
        this.playerStatsService.getTotalPoints(roundId),
        this.playerStatsService.getLeaderboard(roundId),
      ]);
    }

    if (isRoundEnd && hasRoundInCache) {
      void this.playerStatsService.syncUserStats(roundId, userId);
    }

    const winner: LeaderboardEntryDto | undefined = isRoundEnd ? leaderboard[0] : undefined;

    const roundDetails = new RoundDetailsDto(round);
    roundDetails.stats = new RoundStatsDto({
      totalPoints,
      currentUserPoints: playerPoints,
      winner,
    });
    roundDetails.leaderboard = leaderboard;

    return roundDetails;
  }
}
