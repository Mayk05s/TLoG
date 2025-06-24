import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll() {
    return this.prisma.round.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.round.findUnique({
      where: { id },
    });
  }

  async create() {
    const roundDuration = this.configService.get<number>('app.roundDuration') || 60;
    const cooldownDuration = this.configService.get<number>('app.cooldownDuration') || 30;

    const now = new Date();
    const startsAt = new Date(now.getTime() + cooldownDuration * 1000);
    const endsAt = new Date(startsAt.getTime() + roundDuration * 1000);

    return this.prisma.round.create({
      data: {
        starts_at: startsAt,
        ends_at: endsAt,
      },
    });
  }

  async isRoundActive(roundId: string) {
    const round = await this.findOne(roundId);

    if (!round) {
      return false;
    }

    const now = new Date();
    return now >= round.starts_at && now <= round.ends_at;
  }
}
