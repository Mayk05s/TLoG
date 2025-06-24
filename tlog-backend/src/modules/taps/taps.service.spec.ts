import { Test, TestingModule } from '@nestjs/testing';
import { TapsService } from './taps.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RoundsService } from '../rounds/rounds.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Define Role enum manually for testing
enum Role {
  admin = 'admin',
  survivor = 'survivor',
  nikita = 'nikita'
}

describe('TapsService', () => {
  let service: TapsService;
  let prismaService: PrismaService;
  let roundsService: RoundsService;

  // Mock the transaction function
  const mockTx = {
    round: {
      findUnique: jest.fn(),
    },
    playerRoundStats: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tapEvent: {
      create: jest.fn(),
    },
  };

  // Mock implementations
  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockTx)),
    $primary: {
      lock: jest.fn(() => ({})),
    },
  };

  const mockRoundsService = {
    findOne: jest.fn(),
    isRoundActive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TapsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RoundsService, useValue: mockRoundsService },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    service = module.get<TapsService>(TapsService);
    prismaService = module.get<PrismaService>(PrismaService);
    roundsService = module.get<RoundsService>(RoundsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerTap', () => {
    const roundId = 1;
    const userId = 1;
    const now = new Date('2025-06-24T10:30:00Z');

    beforeEach(() => {
      // Mock current date
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should register a tap and add 1 point for survivor', async () => {
      // Mock active round
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T10:00:00Z'), // Before now
        ends_at: new Date('2025-06-24T11:00:00Z'),   // After now
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      // Mock existing player stats
      const mockPlayerStats = {
        id: 1,
        roundId,
        userId,
        taps: 5,
        points: 5,
      };

      // Mock updated player stats
      const mockUpdatedStats = {
        id: 1,
        roundId,
        userId,
        taps: 6,
        points: 6,
      };

      mockTx.round.findUnique.mockResolvedValue(mockRound);
      mockTx.playerRoundStats.findUnique.mockResolvedValue(mockPlayerStats);
      mockTx.playerRoundStats.update.mockResolvedValue(mockUpdatedStats);
      mockTx.tapEvent.create.mockResolvedValue({ id: 1, userId, roundId, createdAt: now });

      const result = await service.registerTap(roundId, userId, Role.survivor);

      expect(result).toEqual({
        myPoints: 6,
        tapCount: 6,
      });

      expect(mockTx.round.findUnique).toHaveBeenCalledWith({
        where: { id: roundId },
      });

      expect(mockTx.playerRoundStats.findUnique).toHaveBeenCalledWith({
        where: {
          roundId_userId: {
            roundId,
            userId,
          },
        },
      });

      expect(mockTx.playerRoundStats.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          taps: 6,
          points: 6,
        },
      });

      expect(mockTx.tapEvent.create).toHaveBeenCalledWith({
        data: {
          userId,
          roundId,
        },
      });
    });

    it('should add 10 points for 11th tap (modulo 11)', async () => {
      // Mock active round
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      // Mock existing player stats with 10 taps
      const mockPlayerStats = {
        id: 1,
        roundId,
        userId,
        taps: 10,
        points: 10,
      };

      // Mock updated player stats (11th tap gives 10 points)
      const mockUpdatedStats = {
        id: 1,
        roundId,
        userId,
        taps: 11,
        points: 20,
      };

      mockTx.round.findUnique.mockResolvedValue(mockRound);
      mockTx.playerRoundStats.findUnique.mockResolvedValue(mockPlayerStats);
      mockTx.playerRoundStats.update.mockResolvedValue(mockUpdatedStats);
      mockTx.tapEvent.create.mockResolvedValue({ id: 1, userId, roundId, createdAt: now });

      const result = await service.registerTap(roundId, userId, Role.survivor);

      expect(result).toEqual({
        myPoints: 20,
        tapCount: 11,
      });

      expect(mockTx.playerRoundStats.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          taps: 11,
          points: 20,
        },
      });
    });

    it('should add 0 points for nikita role', async () => {
      // Mock active round
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      // Mock existing player stats
      const mockPlayerStats = {
        id: 1,
        roundId,
        userId,
        taps: 5,
        points: 0, // Nikita has 0 points
      };

      // Mock updated player stats (still 0 points)
      const mockUpdatedStats = {
        id: 1,
        roundId,
        userId,
        taps: 6,
        points: 0,
      };

      mockTx.round.findUnique.mockResolvedValue(mockRound);
      mockTx.playerRoundStats.findUnique.mockResolvedValue(mockPlayerStats);
      mockTx.playerRoundStats.update.mockResolvedValue(mockUpdatedStats);
      mockTx.tapEvent.create.mockResolvedValue({ id: 1, userId, roundId, createdAt: now });

      const result = await service.registerTap(roundId, userId, Role.nikita);

      expect(result).toEqual({
        myPoints: 0,
        tapCount: 6,
      });

      expect(mockTx.playerRoundStats.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          taps: 6,
          points: 0, // No points for Nikita
        },
      });
    });

    it('should create player stats if not exists', async () => {
      // Mock active round
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T10:00:00Z'),
        ends_at: new Date('2025-06-24T11:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      // Player stats don't exist yet
      mockTx.round.findUnique.mockResolvedValue(mockRound);
      mockTx.playerRoundStats.findUnique.mockResolvedValue(null);

      // Newly created stats
      const mockCreatedStats = {
        id: 1,
        roundId,
        userId,
        taps: 0,
        points: 0,
      };

      // Updated after tap
      const mockUpdatedStats = {
        id: 1,
        roundId,
        userId,
        taps: 1,
        points: 1,
      };

      mockTx.playerRoundStats.create.mockResolvedValue(mockCreatedStats);
      mockTx.playerRoundStats.update.mockResolvedValue(mockUpdatedStats);
      mockTx.tapEvent.create.mockResolvedValue({ id: 1, userId, roundId, createdAt: now });

      const result = await service.registerTap(roundId, userId, Role.survivor);

      expect(result).toEqual({
        myPoints: 1,
        tapCount: 1,
      });

      expect(mockTx.playerRoundStats.create).toHaveBeenCalledWith({
        data: {
          roundId,
          userId,
          taps: 0,
          points: 0,
        },
      });
    });

    it('should throw NotFoundException if round not found', async () => {
      mockTx.round.findUnique.mockResolvedValue(null);

      await expect(service.registerTap(999, userId, Role.survivor)).rejects.toThrow(NotFoundException);
      expect(mockTx.playerRoundStats.findUnique).not.toHaveBeenCalled();
      expect(mockTx.playerRoundStats.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if round is not active (future round)', async () => {
      // Mock future round
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T11:00:00Z'), // After now
        ends_at: new Date('2025-06-24T12:00:00Z'),
        createdAt: new Date('2025-06-24T09:50:00Z'),
      };

      mockTx.round.findUnique.mockResolvedValue(mockRound);

      await expect(service.registerTap(roundId, userId, Role.survivor)).rejects.toThrow(ConflictException);
      expect(mockTx.playerRoundStats.findUnique).not.toHaveBeenCalled();
      expect(mockTx.playerRoundStats.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if round is not active (past round)', async () => {
      // Mock past round
      const mockRound = {
        id: roundId,
        starts_at: new Date('2025-06-24T09:00:00Z'),
        ends_at: new Date('2025-06-24T10:00:00Z'), // Before now
        createdAt: new Date('2025-06-24T08:50:00Z'),
      };

      mockTx.round.findUnique.mockResolvedValue(mockRound);

      await expect(service.registerTap(roundId, userId, Role.survivor)).rejects.toThrow(ConflictException);
      expect(mockTx.playerRoundStats.findUnique).not.toHaveBeenCalled();
      expect(mockTx.playerRoundStats.update).not.toHaveBeenCalled();
    });
  });
});
