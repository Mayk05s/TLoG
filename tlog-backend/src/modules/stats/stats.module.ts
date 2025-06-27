import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { TapsModule } from '../taps/taps.module';

@Module({
  imports: [TapsModule], // Import TapsModule to get BatchService
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
