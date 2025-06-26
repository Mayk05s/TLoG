import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { UserDto } from '../../users/dto/user.dto';

@Exclude()
export class AuthResponseDto {
  @Expose()
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @Expose()
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @Expose()
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken?: string;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
