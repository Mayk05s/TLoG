import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserDto } from '../../users/dto/current-user.dto';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
