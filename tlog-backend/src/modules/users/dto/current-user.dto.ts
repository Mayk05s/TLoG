import { Role, User } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CurrentUserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  role: Role;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.role = user.role;
  }
}
