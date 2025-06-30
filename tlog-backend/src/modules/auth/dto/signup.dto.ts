import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty({ message: 'Username cannot be empty' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters' })
  @ApiProperty({
    example: 'john_doe',
    description: 'Username for registration. Must be 3-20 characters long.',
  })
  username: string;

  @IsNotEmpty({ message: 'Password cannot be empty' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  // @Matches(/[a-z]/, { message: 'Password must contain at least 1 lowercase letter' })
  // @Matches(/[A-Z]/, { message: 'Password must contain at least 1 uppercase letter' })
  // @Matches(/[0-9]/, { message: 'Password must contain at least 1 number' })
  // @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
  //   message: 'Password must contain at least 1 special character',
  // })
  @ApiProperty({
    example: 'mypassword123',
    description: 'Password must be 6-32 characters long.',
  })
  password: string;
}
