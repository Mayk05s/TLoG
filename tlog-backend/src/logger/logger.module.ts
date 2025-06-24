import {Global, Module} from '@nestjs/common';
import {LoggerModule as PinoModule} from 'nestjs-pino';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {createPinoConfig} from './create-pino-config';


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
  exports: [PinoModule],
})
export class LoggerModule {
}
