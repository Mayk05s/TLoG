import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserDto } from '../../users/dto/current-user.dto';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserDto => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  },
);
