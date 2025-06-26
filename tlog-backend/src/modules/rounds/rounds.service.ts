import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RoundDto } from './dto/round.dto';

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<RoundDto[]> {
    const rounds = await this.prisma.round.findMany({
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
}
