import { Body, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUserDto } from '../users/dto/current-user.dto';
import { UserDto } from '../users/dto/user.dto';
import { Public } from './decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Public()
  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(signupDto);
  }

  @Post('refresh')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@CurrentUser() currentUser: CurrentUserDto): Promise<AuthResponseDto> {
    return this.authService.refresh(currentUser);
  }

  @Get('profile')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() currentUserDto: CurrentUserDto): Promise<UserDto> {
    const user: User | null = await this.usersService.findById(currentUserDto.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new UserDto(user);
  }
}
