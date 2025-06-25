import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerModule as PinoModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { createPinoConfig } from './create-pino-config';
import { PrismaLogger } from './prisma-logger';
import { ConfigService } from '../config/config.service';
import { RequestContextMiddleware } from './request-context.middleware';

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
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
