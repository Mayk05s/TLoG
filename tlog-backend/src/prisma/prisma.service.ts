import {INestApplication, Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {ConfigService} from '@nestjs/config';
import {Logger} from 'nestjs-pino';
import {PrismaLogger} from '../logger/prisma-logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
    private readonly prismaLogger: PrismaLogger
  ) {
    const dbUrl = configService.get<string>('database.url');

    // Initialize PrismaClient with event-based logging
    super({
      datasourceUrl: dbUrl,
      log: prismaLogger.getPrismaLogHandler(),
    });

    // Attach the logger to Prisma events
    this.prismaLogger.attachLoggerToPrisma(this);

    // Mask DB URL for security in logs
    const maskedUrl = dbUrl?.substring(0, dbUrl.indexOf(':', 11)) + ':*****';
    logger.log(`Initializing Prisma with database URL: ${maskedUrl}`);
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from database');
    } catch (error) {
      this.logger.error(`Error disconnecting from database: ${error.message}`);
    }
  }
}
