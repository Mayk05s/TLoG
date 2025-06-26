import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import { SerializationGroup } from '../../../common/enums/serialization-group.enum';

@Exclude()
export class UserDto {
  @Expose()
  @ApiProperty({ description: 'User ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Username' })
  username: string;

  @Expose({ groups: [SerializationGroup.ADMIN] })
  @ApiProperty({ enum: Role, description: 'User role' })
  role: Role;

  @Expose({ groups: [SerializationGroup.SELF] })
  @ApiPropertyOptional({ description: 'Account creation date' })
  createdAt?: Date;

  // password and passwordHash are not exposed to any group (sensitive data)
  // They will be automatically excluded

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
