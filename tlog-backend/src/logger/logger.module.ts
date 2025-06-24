import {Global, Module} from '@nestjs/common';
import {WinstonModule} from 'nest-winston';
import {CorrelationIdService} from './correlation-id.service';
import {LoggingInterceptor} from './logging.interceptor';
import {APP_INTERCEPTOR} from '@nestjs/core';
import {ConfigModule, ConfigService} from "@nestjs/config";
import {createWinstonConfig} from "./winston.config";

@Global()
@Module({
  imports: [
    ConfigModule,
    // WinstonModule.forRootAsync({...})
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createWinstonConfig(configService),
    }),
  ],
  providers: [
    CorrelationIdService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [WinstonModule, CorrelationIdService],
})
export class LoggerModule {
}
