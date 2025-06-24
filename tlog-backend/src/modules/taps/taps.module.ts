import { Module } from '@nestjs/common';
import { TapsController } from './taps.controller';
import { TapsService } from './taps.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RoundsService } from '../rounds/rounds.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [TapsController],
  providers: [TapsService, PrismaService, RoundsService],
})
export class TapsModule {}
