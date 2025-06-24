import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const dbUrl = configService.get<string>('database.url');
    super({
      datasourceUrl: dbUrl,
      log: ['query', 'info', 'warn', 'error'],
    });
    this.logger.log(`Initializing Prisma with database URL: ${dbUrl?.substring(0, dbUrl.indexOf(':', 11)) + ':*****'}`);
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
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.logger.log('Enabling application shutdown hooks');
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
