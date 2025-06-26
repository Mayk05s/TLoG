import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findByIdAsDto(id: string): Promise<UserDto | null> {
    const user = await this.findById(id);
    return user ? new UserDto(user) : null;
  }

  async findByUsernameAsDto(username: string): Promise<UserDto | null> {
    const user = await this.findByUsername(username);
    return user ? new UserDto(user) : null;
  }

  determineRole(username: string): Role {
    const lowerUsername = username.toLowerCase();

    if (lowerUsername === 'admin') {
      return Role.admin;
    }

    if (lowerUsername === 'nikita' || lowerUsername === 'никита') {
      return Role.nikita;
    }

    return Role.survivor;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const role = this.determineRole(createUserDto.username);

    return this.prisma.user.create({
      data: {
        username: createUserDto.username,
        password: createUserDto.password,
        role,
      },
    });
  }

  async createAsDto(createUserDto: CreateUserDto): Promise<UserDto> {
    const user = await this.create(createUserDto);
    return new UserDto(user);
  }
}
