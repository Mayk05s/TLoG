import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// The Role enum might need to be defined manually if not exported by Prisma
enum Role {
  admin = 'admin',
  survivor = 'survivor',
  nikita = 'nikita',
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  // Mock implementation for the services
  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      const mockUser = {
        id: 1,
        username: 'test',
        password: await bcrypt.hash('password', 10),
        role: Role.survivor,
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test', 'password');

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.username).toBe('test');
      expect(result.password).toBeUndefined();
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('test', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const mockUser = {
        id: 1,
        username: 'test',
        password: await bcrypt.hash('correct-password', 10),
        role: Role.survivor,
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      const mockUser = {
        id: 1,
        username: 'test',
        role: Role.survivor,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);

      const result = await service.login('test', 'password');

      expect(result.accessToken).toBe('test-token');
      expect(result.user).toEqual({
        id: 1,
        username: 'test',
        role: Role.survivor,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'test',
        sub: 1,
        role: Role.survivor,
      });
    });

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login('test', 'password')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const mockCreatedUser = {
        id: 1,
        username: 'test',
        role: Role.survivor,
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      jest.spyOn(service, 'mapRoleByUsername').mockResolvedValue(Role.survivor);
      jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed-password');

      const result = await service.register('test', 'password');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'test',
          password: 'hashed-password',
          role: Role.survivor,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });

      expect(result).toEqual(mockCreatedUser);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        username: 'test',
        password: 'hashed',
        role: Role.survivor,
        createdAt: new Date(),
      });

      await expect(service.register('test', 'password')).rejects.toThrow('Username already exists');
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('mapRoleByUsername', () => {
    it('should map admin username to admin role', async () => {
      const result = await service.mapRoleByUsername('admin');
      expect(result).toBe(Role.admin);
    });

    it('should map nikita username to nikita role', async () => {
      const result1 = await service.mapRoleByUsername('nikita');
      const result2 = await service.mapRoleByUsername('Никита');

      expect(result1).toBe(Role.nikita);
      expect(result2).toBe(Role.nikita);
    });

    it('should map other usernames to survivor role', async () => {
      const result = await service.mapRoleByUsername('player1');
      expect(result).toBe(Role.survivor);
    });
  });

  describe('hashPassword', () => {
    it('should return hashed password', async () => {
      const password = 'password';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).not.toBe(password);
      expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
    });
  });
});
