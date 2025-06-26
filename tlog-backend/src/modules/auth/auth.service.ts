import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CurrentUserDto } from '../users/dto/current-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      return new CurrentUserDto(user);
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
    const userDto = new CurrentUserDto(newUser);

    return this.generateTokens(userDto);
  }

  async refresh(user: any): Promise<AuthResponseDto> {
    const freshUser = await this.usersService.findById(user.id);

    if (!freshUser) {
      throw new UnauthorizedException('User not found');
    }

    const userDto = new CurrentUserDto(freshUser);
    return this.generateTokens(userDto);
  }

  private generateTokens(user: CurrentUserDto): AuthResponseDto {
    const payload = { username: user.username, sub: user.id, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: user,
    };
  }
}
