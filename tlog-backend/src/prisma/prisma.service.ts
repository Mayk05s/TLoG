import {Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {PrismaLogger} from '../logger/prisma-logger';
import {ConfigService} from "../config/config.service";
import {RequestContextStorage} from '../logger/request-context-storage';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private static connected = false;
  private static instance: PrismaService | null = null;

  constructor(
    private configService: ConfigService,
    private readonly prismaLogger: PrismaLogger
  ) {
    const {databaseUrl} = configService
    super({
      datasourceUrl: databaseUrl,
      log: prismaLogger.getPrismaLogHandler(),
    });

    if (PrismaService.instance) {
      this.logger.verbose('PrismaService instance already exists. Returning existing instance.');
      return;
    }

    // Сначала подключим обработчики событий Prisma для логирования
    this.prismaLogger.attachLoggerToPrisma(this);

    // Добавляем middleware для передачи requestId в каждый запрос
    this.$use(async (params, next) => {
      // Получаем ID текущего запроса
      const requestId = RequestContextStorage.getRequestId();

      // Если есть ID запроса, добавляем его в параметры запроса для логирования
      if (requestId) {
        // Сохраняем requestId в контексте Prisma для доступа в обработчиках событий
        Object.defineProperty(this, '_lastRequestId', {
          value: requestId,
          writable: true,
          configurable: true,
        });

        this.logger.debug(`Prisma ${params.action} on ${params.model || 'raw'} | RequestID: ${requestId}`);
      }

      return next(params);
    });

    PrismaService.instance = this;
  }

  async onModuleInit() {
    if (PrismaService.connected) {
      this.logger.verbose('Connection already established, skipping initialization. Please remove existing PrismaService from provider.');
      return;
    }
    try {
      this.logger.log(`Connecting to database...`);
      await this.$connect();
      PrismaService.connected = true;
      this.logger.log(`Successfully connected to database`);
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log(`Disconnecting from database...`);
    try {
      await this.$disconnect();
      this.logger.log(`Successfully disconnected from database`);
      PrismaService.connected = false;
      PrismaService.instance = null;
    } catch (error) {
      this.logger.error(`Error disconnecting from database: ${error.message}`);
    }
  }
}
