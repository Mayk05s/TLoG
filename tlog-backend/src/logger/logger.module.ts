import {Global, Module} from '@nestjs/common';
import {LoggerModule as PinoModule} from 'nestjs-pino';
import {ConfigModule} from '@nestjs/config';
import {createPinoConfig} from './create-pino-config';
import {PrismaLogger} from "./prisma-logger";
import {RequestContextService} from './request-context.service';
import {ConfigService} from "../config/config.service";


@Global()
@Module({
  imports: [
    ConfigModule,
    PinoModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createPinoConfig,
    }),
  ],
  providers: [RequestContextService, PrismaLogger],
  exports: [PinoModule, PrismaLogger, RequestContextService],
})
export class LoggerModule {
}
