import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CurrentUserDto {
  id: string;
  username: string;
  @ApiProperty({ enum: Role, example: 'survivor' })
  role: Role;
}
