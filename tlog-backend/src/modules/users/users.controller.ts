import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserDto } from './dto/user.dto';
import { Role } from '@prisma/client';
import { GetUserByUsernameDto } from './dto/get-user-by-username.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Get all users' })
  async getAllUsers(): Promise<UserDto[]> {
    return this.userService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new UserDto(user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @Get('/username/:username')
  @ApiOperation({ summary: 'Get user by username' })
  async getUserByUsername(@Param() params: GetUserByUsernameDto): Promise<UserDto> {
    const user = await this.userService.findByUsername(params.username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new UserDto(user);
  }
}
