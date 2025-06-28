import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RoundDto } from './dto/round.dto';
import { RoundStatus } from './enums/round-status.enum';
import { Round } from '@prisma/client';
import { RoundStatsDto } from './dto';

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

  async findOne(id: string): Promise<RoundDto | null> {
    const round = await this.prisma.round.findUnique({
      where: { id },
    });

    return round ? new RoundDto(round) : null;
  }

  async create(): Promise<RoundDto> {
    const roundDuration = this.configService.get<number>('app.roundDuration') || 60;
    const cooldownDuration = this.configService.get<number>('app.cooldownDuration') || 30;

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

  async isRoundActive(roundId: string): Promise<boolean> {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return false;
    }

    const now = new Date();
    return now >= round.startsAt && now <= round.endsAt;
  }

  async getActiveRound(roundId: string): Promise<Round> {
    const round: Round | null = await this.prisma.round.findUnique({
      where: { id: roundId },
    });
    if (!round) {
      throw new NotFoundException('Round not found');
    }

    const now = new Date();
    if (now < round.startsAt || now > round.endsAt) {
      throw new ConflictException('Round is not active');
    }

    return round;
  }

  /**
   * Get statistics for a round including player points and leaderboard
   */
  async roundStats(roundId: string, userId?: string): Promise<RoundStatsDto> {
    let playerPoints = 0;

    return this.tapsService.getStats(roundId, user.id);
    // Get player points if userId provided
    if (userId) {
      const counters = await this.tapCache.getCounters(roundId, userId);
      playerPoints = counters.points;
    }

    // Get leaderboard from Redis and convert userIds to usernames
    const leaderboard = await this.buildLeaderboard(roundId, 10);

    return {
      playerPoints,
      leaderboard,
    };
  }
}
