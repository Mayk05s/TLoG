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

  @Expose({ groups: [SerializationGroup.SELF, SerializationGroup.ADMIN] })
  @ApiPropertyOptional({ description: 'Account creation date' })
  createdAt?: Date;

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
