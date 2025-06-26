import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { GameModule } from './modules/game.module';
import { LoggerModule } from './logger/logger.module';
import { ConfigRootModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { GroupsInterceptor } from './interceptors/groups.interceptor';

@Module({
  imports: [ConfigRootModule, LoggerModule, DatabaseModule, GameModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: GroupsInterceptor,
    },
  ],
})
export class AppModule {}
