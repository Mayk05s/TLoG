import { Test, TestingModule } from '@nestjs/testing';
import { RoundsService } from './rounds.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

const mockPrismaService = {
  round: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  playerRoundStats: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn().mockImplementation(key => {
    if (key === 'app.roundDuration') return 60;
    if (key === 'app.cooldownDuration') return 30;
    return null;
  }),
};

describe('RoundsService', () => {
  let service: RoundsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoundsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RoundsService>(RoundsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveRounds', () => {
    it('should return rounds ended in the last 24 hours', async () => {
      const mockRounds = [
        {
          id: 1,
          starts_at: new Date('2025-06-23T10:00:00Z'),
          ends_at: new Date('2025-06-23T11:00:00Z'),
          createdAt: new Date('2025-06-23T09:50:00Z'),
        },
        {
          id: 2,
          starts_at: new Date('2025-06-24T10:00:00Z'),
          ends_at: new Date('2025-06-24T11:00:00Z'),
          createdAt: new Date('2025-06-24T09:50:00Z'),
        },
      ];

      mockPrismaService.round.findMany.mockResolvedValue(mockRounds);

      const result = await service.getActiveRounds();

      expect(result).toEqual(mockRounds);
      expect(mockPrismaService.round.findMany).toHaveBeenCalledWith({
        where: {
          ends_at: {
            gte: expect.any(Date),
          },
        },
        orderBy: {
          starts_at: 'desc',
        },
      });
    });
  });

  describe('createRound', () => {
    it('should create a new round with proper timestamps', async () => {
      // Mock date
      const mockNow = new Date('2025-06-24T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const mockCreatedRound = {
        id: 1,
        starts_at: new Date('2025-06-24T10:00:30Z'), // now + 30s cooldown
        ends_at: new Date('2025-06-24T10:01:30Z'), // starts_at + 60s duration
        createdAt: mockNow,
      };

      mockPrismaService.round.create.mockResolvedValue(mockCreatedRound);

      const result = await service.createRound();

      expect(result).toEqual(mockCreatedRound);
      expect(mockPrismaService.round.create).toHaveBeenCalledWith({
        data: {
          starts_at: new Date('2025-06-24T10:00:30Z'),
          ends_at: new Date('2025-06-24T10:01:30Z'),
        },
      });

      // Reset Date mock
      jest.restoreAllMocks();
    });
  });

  describe('getRoundById', () => {
    it('should return a round by id', async () => {
      const mockRound = {
        id: 1,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);

      const result = await service.getRoundById(1);

      expect(result).toEqual(mockRound);
      expect(mockPrismaService.round.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if round not found', async () => {
      mockPrismaService.round.findUnique.mockResolvedValue(null);

      await expect(service.getRoundById(999)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.round.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('getRoundWithStats', () => {
    it('should return round with user stats and winner', async () => {
      const mockRound = {
        id: 1,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      const mockUserStats = {
        id: 1,
        userId: 1,
        roundId: 1,
        taps: 10,
        points: 10,
      };

      const mockWinner = {
        id: 1,
        userId: 2,
        roundId: 1,
        taps: 11,
        points: 20,
        user: {
          id: 2,
          username: 'winner',
          role: Role.survivor,
        },
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);
      mockPrismaService.playerRoundStats.findUnique.mockResolvedValue(mockUserStats);
      mockPrismaService.playerRoundStats.findFirst.mockResolvedValue(mockWinner);

      // Mock the current time to be during the round
      const mockNow = new Date('2025-06-24T10:30:00Z'); // In the middle of the round
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.getRoundWithStats(1, 1);

      expect(result).toEqual({
        ...mockRound,
        status: 'active',
        myPoints: 10,
        winner: mockWinner.user,
      });

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should return correct status for waiting round', async () => {
      const mockRound = {
        id: 1,
        starts_at: new Date('2025-06-24T11:00:00Z'), // In the future
        ends_at: new Date('2025-06-24T12:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);
      mockPrismaService.playerRoundStats.findUnique.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findFirst.mockResolvedValue(null);

      // Mock the current time to be before the round starts
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.getRoundWithStats(1, 1);

      expect(result.status).toBe('waiting');
      expect(result.myPoints).toBe(0);
      expect(result.winner).toBe(null);

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should return correct status for finished round', async () => {
      const mockRound = {
        id: 1,
        starts_at: new Date('2025-06-23T10:00:00Z'), // In the past
        ends_at: new Date('2025-06-23T11:00:00Z'), // In the past
        createdAt: new Date('2025-06-23T09:50:00Z'),
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);
      mockPrismaService.playerRoundStats.findUnique.mockResolvedValue(null);
      mockPrismaService.playerRoundStats.findFirst.mockResolvedValue(null);

      // Mock the current time to be after the round ends
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.getRoundWithStats(1, 1);

      expect(result.status).toBe('finished');

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should throw NotFoundException if round not found', async () => {
      mockPrismaService.round.findUnique.mockResolvedValue(null);

      await expect(service.getRoundWithStats(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('isRoundActive', () => {
    it('should return true when round is active', async () => {
      const mockRound = {
        id: 1,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);

      // Mock the current time to be during the round
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.isRoundActive(1);

      expect(result).toBe(true);

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should return false when round is not active', async () => {
      const mockRound = {
        id: 1,
        starts_at: new Date('2025-06-24T11:00:00Z'), // In the future
        ends_at: new Date('2025-06-24T12:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      mockPrismaService.round.findUnique.mockResolvedValue(mockRound);

      // Mock the current time to be before the round starts
      const mockNow = new Date('2025-06-24T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any);

      const result = await service.isRoundActive(1);

      expect(result).toBe(false);

      // Reset Date mock
      jest.restoreAllMocks();
    });

    it('should return false if round not found', async () => {
      mockPrismaService.round.findUnique.mockResolvedValue(null);

      const result = await service.isRoundActive(999);

      expect(result).toBe(false);
    });
  });
});
