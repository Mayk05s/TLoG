import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigService } from './config.service';
import { validationSchema } from './validation.schema';
import appConfig from './profiles/app.config';
import dbConfig from './profiles/db.config';
import jwtConfig from './profiles/jwt.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig],
      validationSchema,
    }),
  ],
  providers: [
    {
      provide: ConfigService,
      useFactory: (nestConfigService: NestConfigService) => {
        return new ConfigService(nestConfigService);
      },
      inject: [NestConfigService],
    },
  ],
  exports: [ConfigService],
})
export class ConfigRootModule {}
