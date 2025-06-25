import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RoundsService } from '../rounds/rounds.service';
import { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class TapsService {
  constructor(
    private prisma: PrismaService,
    private roundsService: RoundsService,
  ) {}

  async registerTap(roundId: string, userId: string, userRole: Role) {
    // Use a transaction to prevent race conditions
    return this.prisma.$transaction(async tx => {
      // Step 1: Get round
      const round = await tx.round.findUnique({
        where: { id: roundId },
      });

      if (!round) {
        throw new NotFoundException('Round not found');
      }

      // Check if round is active (started but not ended)
      const now = new Date();
      if (now < round.starts_at || now > round.ends_at) {
        throw new ConflictException('Round is not active');
      }

      // Step 2: Get player stats or create new if doesn't exist
      let playerStats = await tx.playerRoundStats.findUnique({
        where: {
          roundId_userId: {
            roundId: roundId,
            userId: userId,
          },
        },
      });

      if (!playerStats) {
        playerStats = await tx.playerRoundStats.create({
          data: {
            roundId: roundId,
            userId: userId,
            taps: 0,
            points: 0,
          },
        });
      }

      // Step 3: Calculate new taps and points
      const newTap = playerStats.taps + 1;

      // Step 4: Calculate points delta based on user role and tap count
      // If user is nikita, no points are awarded
      // If tap is every 11th tap, award 10 points
      // Otherwise award 1 point
      const delta = userRole === Role.nikita ? 0 : newTap % 11 === 0 ? 10 : 1;

      // Step 5: Update stats
      const updatedStats = await tx.playerRoundStats.update({
        where: {
          roundId_userId: {
            roundId: roundId,
            userId: userId,
          },
        },
        data: {
          taps: newTap,
          points: {
            increment: delta,
          },
        },
      });

      // Step 6: Create tap event record for audit trail
      await tx.tapEvent.create({
        data: {
          roundId: roundId,
          userId: userId,
          createdAt: now,
        },
      });

      // Step 7: Return the updated points
      return {
        myPoints: updatedStats.points,
      };
    });
  }
}
