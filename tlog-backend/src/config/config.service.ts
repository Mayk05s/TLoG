import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get port(): number {
    return this.configService.get<number>('app.port') ?? 3000;
  }

  get databaseUrl(): string {
    return this.configService.get<string>('database.url') ?? '';
  }

  get roundDuration(): number {
    return this.configService.get<number>('app.roundDuration') ?? 60;
  }

  get cooldownDuration(): number {
    return this.configService.get<number>('app.cooldownDuration') ?? 30;
  }

  get jwtSecret(): string {
    return this.configService.get<string>('jwt.secret') ?? '';
  }
}
