import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Logger } from 'nestjs-pino';

@Injectable()
export class PrismaLogger {
  constructor(private readonly logger: Logger) {}

  /**
   * Creates a Prisma log handler that redirects logs to Pino
   */
  getPrismaLogHandler(): Prisma.LogDefinition[] {
    return [
      {
        level: 'query',
        emit: 'event',
      },
      {
        level: 'info',
        emit: 'event',
      },
      {
        level: 'warn',
        emit: 'event',
      },
      {
        level: 'error',
        emit: 'event',
      },
    ];
  }

  /**
   * Binds Prisma logging events to Pino logger
   * @param prismaClient - The PrismaClient instance
   */
  attachLoggerToPrisma(prismaClient: any): void {
    // Log queries
    prismaClient.$on('query' as any, (e: Prisma.QueryEvent) => {
      // Format for query logs - include operation in the message for better readability
      const operation = this.extractQueryOperation(e.query);

      this.logger.debug(
        {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        },
        `prisma:query ${operation}`
      );
    });

    // Log info messages
    prismaClient.$on('info' as any, (e: Prisma.LogEvent) => {
      this.logger.log(
        { prisma: true }, // Simple marker to identify prisma logs
        `prisma:info ${e.message}`
      );
    });

    // Log warnings
    prismaClient.$on('warn' as any, (e: Prisma.LogEvent) => {
      this.logger.warn(
        { prisma: true },
        `prisma:warn ${e.message}`
      );
    });

    // Log errors
    prismaClient.$on('error' as any, (e: Prisma.LogEvent) => {
      this.logger.error(
        {
          prisma: true,
          message: e.message,
          timestamp: e.timestamp,
        },
        `prisma:error ${e.message}`
      );
    });
  }

  /**
   * Extracts the operation type (SELECT, INSERT, etc.) from a SQL query
   */
  private extractQueryOperation(query: string): string {
    const operation = query.trim().split(' ')[0];
    return operation;
  }
}
