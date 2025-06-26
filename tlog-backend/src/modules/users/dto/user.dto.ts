import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserDto {
  @ApiProperty({ example: 1 })
  id: string;

  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiProperty({ enum: Role, example: 'survivor' })
  role: Role;

  @ApiProperty({ example: '2025-06-24T19:56:50.000Z' })
  createdAt: Date;
}
