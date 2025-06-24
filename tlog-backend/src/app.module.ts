import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {PrismaService} from './prisma/prisma.service';
import {GameModule} from './modules/game.module';
import {LoggerModule} from './logger/logger.module';
import {ConfigRootModule} from './config/config.module';

@Module({
  imports: [
    ConfigRootModule,
    LoggerModule,
    GameModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {
}
