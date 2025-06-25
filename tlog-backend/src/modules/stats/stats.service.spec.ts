import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

const mockPrismaService = {
  round: {
    findUnique: jest.fn(),
  },
  playerRoundStats: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('StatsService', () => {
  let service: StatsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<StatsService>(StatsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRoundStats', () => {
    const roundId = 1;
    const userId = 1;

    it('should return round stats with winner and participants', async () => {
      // Mock active round
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      // Mock user stats
      const mockUserStats = {
        id: 1,
        roundId,
        userId,
        taps: 10,
        points: 10,
      };

      // Mock winner
      const mockWinner = {
        id: 2,
        roundId,
        userId: 2,
        taps: 11,
        points: 20,
        user: {
          id: 2,
          username: 'winner',
          role: Role.survivor,
        },
      };

      // Mock all participants
      const mockParticipants = [
        mockWinner,
        {
          id: 1,
          roundId,
          userId,
          taps: 10,
          points: 10,
          user: {
            id: userId,
            username: 'player1',
            role: Role.survivor,
          },
        },
      ];

      // Set up mocks
      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);
      mockPrismaService.playerRoundStats.findUnique.mockResolvedValue(mockUserStats);
      mockPrismaService.playerRoundStats.findFirst.mockResolvedValue(mockWinner);
      mockPrismaService.playerRoundStats.findMany.mockResolvedValue(mockParticipants);

      // Mock current time to be during the round
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.getRoundStats(roundId, userId);

      expect(result).toEqual({
        round: mockRound,
        status: 'active',
        myPoints: 10,
        myTaps: 10,
        winner: mockWinner.user,
        participants: mockParticipants,
      });

      expect(mockPrismaService.round.findUnique).toHaveBeenCalledWith({
        where: { id: roundId },
      });

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should handle case when user has no stats for round', async () => {
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      // No user stats
      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);
      mockPrismaService.playerRoundStats.findUnique.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findFirst.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findMany.mockResolvedValue([]);

      // Mock current time
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.getRoundStats(roundId, userId);

      expect(result.myPoints).toBe(0);
      expect(result.myTaps).toBe(0);
      expect(result.winner).toBe(null);
      expect(result.participants).toEqual([]);

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should throw NotFoundException if round not found', async () => {
      mockPrismaService.round.findUnique.mockResolvedValue(null);

      await expect(service.getRoundStats(999, userId)).rejects.toThrow(NotFoundException);
    });

    it('should return correct status for waiting round', async () => {
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T11:00:00Z'), // In the future
        ends_at: new Date('2025-06-24T12:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);
      mockPrismaService.playerRoundStats.findUnique.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findFirst.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findMany.mockResolvedValue([]);

      // Mock current time to be before the round starts
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.getRoundStats(roundId, userId);

      expect(result.status).toBe('waiting');

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should return correct status for finished round', async () => {
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T09:00:00Z'),
        ends_at: new Date('2025-06-24T10:00:00Z'), // In the past
        createdAt: new Date('2025-06-24T08:50:00Z'),
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);
      mockPrismaService.playerRoundStats.findUnique.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findFirst.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findMany.mockResolvedValue([]);

      // Mock current time to be after the round ends
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.getRoundStats(roundId, userId);

      expect(result.status).toBe('finished');

      // Reset Date mock
      jest.restoreAllMocks();
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard data from query', async () => {
      const mockLeaderboard = [
        {
          id: 1,
          username: 'player1',
          role: Role.survivor,
          total_points: 100,
          total_taps: 50,
        },
        {
          id: 2,
          username: 'player2',
          role: Role.survivor,
          total_points: 90,
          total_taps: 45,
        },
      ];

      mockPrismaService.$queryRaw.mockResolvedValue(mockLeaderboard);

      const result = await service.getLeaderboard();

      expect(result).toEqual(mockLeaderboard);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });
});
