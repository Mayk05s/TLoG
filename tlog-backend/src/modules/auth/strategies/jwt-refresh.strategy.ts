import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../../config/config.service';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';
import { CurrentUserDto } from '../../users/dto/current-user.dto';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string }): Promise<CurrentUserDto> {
    // Compatible with both Express and Fastify
    const authHeader = req.headers?.authorization || req.get?.('Authorization');
    const refreshToken = authHeader?.replace('Bearer', '').trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    // if (!user || !user.isActive) throw new UnauthorizedException();
    return new CurrentUserDto(user);
  }
}
