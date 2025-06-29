import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserDto } from '../users/dto/user.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(username: string, password: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersService.findByUsername(dto.username);

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hash = await bcrypt.hash(dto.password, 12);

    // Create a new user using the UsersService
    const createUserDto: CreateUserDto = {
      username: dto.username,
      password: hash,
    };

    const newUser = await this.usersService.create(createUserDto);
    return this.generateTokens(newUser);
  }

  async refresh(user: any): Promise<AuthResponseDto> {
    const freshUser = await this.usersService.findById(user.id);

    if (!freshUser) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateTokens(freshUser);
  }

  private generateTokens(user: User): AuthResponseDto {
    const payload = { username: user.username, sub: user.id, role: user.role };

    return new AuthResponseDto({
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: new UserDto(user),
    });
  }
}
