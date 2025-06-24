import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaLogger } from '../logger/prisma-logger';
import {LoggerModule} from "../logger/logger.module";

@Global()
@Module({
  imports: [LoggerModule],
  providers: [PrismaService, PrismaLogger],
  exports: [PrismaService],
})
export class DatabaseModule {}
