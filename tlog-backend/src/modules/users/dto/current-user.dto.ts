import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CurrentUserDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty({ enum: Role, example: 'survivor' })
  role: Role;

  @Expose({ groups: ['self'] })
  @ApiPropertyOptional()
  createdAt?: Date;

  @Expose({ groups: ['self'] })
  @ApiPropertyOptional()
  updatedAt?: Date;

  // password and passwordHash are not exposed to any group (sensitive data)

  constructor(partial: Partial<CurrentUserDto>) {
    Object.assign(this, partial);
  }
}
