import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'username' })
  username: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'password' })
  password: string;
}
