import { Module } from '@nestjs/common';
import { RoundsController } from './rounds.controller';
import { RoundsService } from './rounds.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [RoundsController],
  providers: [RoundsService, PrismaService],
  exports: [RoundsService]
})
export class RoundsModule {}
