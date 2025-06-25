import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CurrentUserDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiProperty({ enum: Role, example: 'survivor' })
  role: Role;
}
