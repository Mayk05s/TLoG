import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisModule } from './redis.module';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule, RedisModule],
  providers: [PrismaService],
  exports: [PrismaService, RedisModule],
})
export class DatabaseModule {}
