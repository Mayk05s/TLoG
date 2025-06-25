import {Injectable, Logger} from '@nestjs/common';
import { RequestContextStorage } from './request-context-storage';

// Define the log types expected by PrismaClient
type PrismaLogDefinition = {
  level: 'query' | 'info' | 'warn' | 'error';
  emit: 'stdout' | 'event';
};

// Define event types for Prisma client events
type QueryEvent = {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
};

type LogEvent = {
  timestamp: Date;
  message: string;
  target: string;
};

@Injectable()
export class PrismaLogger {
  private readonly logger = new Logger('Prisma');
  constructor() {}

  getPrismaLogHandler(): PrismaLogDefinition[] {
    return [
      {level: 'query', emit: 'event'},
      {level: 'warn', emit: 'event'},
      {level: 'error', emit: 'event'},
    ];
  }

  private getCurrentRequestId(prisma?: any): string | undefined {
    const storageRequestId = RequestContextStorage.getRequestId();
    if (storageRequestId) {
      return storageRequestId;
    }

    if (prisma && prisma._lastRequestId) {
      return prisma._lastRequestId;
    }
    return undefined;
  }


  attachLoggerToPrisma(prisma: any): void {
    prisma.$on('query', (e: QueryEvent) => {
      const requestId = this.getCurrentRequestId(prisma);
      const logData: Record<string, any> = {};
      if (requestId) {
        logData.req = { id: requestId };
      }
      logData.duration = `${e.duration}ms`;

      this.logger.debug(`"${e.query}" ${e.duration}ms (${requestId})`);
    });

    // For warning events
    prisma.$on('warn', (e: LogEvent) => {
      const requestId = this.getCurrentRequestId(prisma);
      const logMessage = e.message;

      if (requestId) {
        this.logger.warn(`${logMessage} {"requestId":"${requestId}"}`);
      } else {
        this.logger.warn(logMessage);
      }
    });

    // For error events
    prisma.$on('error', (e: LogEvent) => {
      const requestId = this.getCurrentRequestId(prisma);
      const logMessage = e.message;

      if (requestId) {
        this.logger.error(`${logMessage} {"requestId":"${requestId}"}`);
      } else {
        this.logger.error(logMessage);
      }
    });
  }
}
