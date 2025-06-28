import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
