import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from '../../config/config.service';
import {PrismaService} from "../../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          // Extract JWT from cookie
          return request?.cookies?.jwt;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: any) {
    // Check if user exists in DB
    const user = await this.prisma.user.findUnique({
      where: {id: payload.sub},
      select: {id: true, username: true, role: true},
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
