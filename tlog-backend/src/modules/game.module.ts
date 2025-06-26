import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RoundsModule } from './rounds/rounds.module';
import { TapsModule } from './taps/taps.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, RoundsModule, TapsModule, StatsModule, UsersModule],
  exports: [AuthModule, RoundsModule, TapsModule, StatsModule, UsersModule],
})
export class GameModule {}
