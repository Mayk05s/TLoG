import {Global, Module} from '@nestjs/common';
import {LoggerModule as PinoModule} from 'nestjs-pino';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {createPinoConfig} from './create-pino-config';
import {PrismaLogger} from "./prisma-logger";


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
  providers: [PrismaLogger],
  exports: [PinoModule, PrismaLogger],
})
export class LoggerModule {
}
