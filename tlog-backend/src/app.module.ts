import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './modules/game.module';
import { LoggerModule } from './logger/logger.module';
import { ConfigRootModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [ConfigRootModule, LoggerModule, DatabaseModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
