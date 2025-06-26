import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../../config/config.service';
import { UsersService } from '../../users/users.service';
import { CurrentUserDto } from '../../users/dto/current-user.dto';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: { sub: string }): Promise<CurrentUserDto> {
    const user = await this.usersService.findById(payload.sub);

    // if (!user || !user.isActive)
    if (!user) {
      throw new UnauthorizedException();
    }
    return new CurrentUserDto(user);
  }
}
