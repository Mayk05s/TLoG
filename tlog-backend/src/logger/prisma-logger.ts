import {Injectable, Logger} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
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
  // Using NestJS built-in logger with a custom context
  private readonly logger = new Logger('Prisma');

  constructor(private readonly pinoLogger: PinoLogger) {
    this.pinoLogger.setContext('Prisma');
  }

  /**
   * Creates a Prisma log handler that redirects logs to NestJS logger
   */
  getPrismaLogHandler(): PrismaLogDefinition[] {
    return [
      {level: 'query', emit: 'event'},
      {level: 'warn', emit: 'event'},
      {level: 'error', emit: 'event'},
    ];
  }

  /**
   * Получает ID запроса из текущего контекста или из Prisma
   */
  private getCurrentRequestId(prisma?: any): string | undefined {
    // Сначала попробуем получить ID из AsyncLocalStorage
    const storageRequestId = RequestContextStorage.getRequestId();
    if (storageRequestId) {
      return storageRequestId;
    }

    // Если не получилось, проверяем сохраненный ID в prisma
    if (prisma && prisma._lastRequestId) {
      return prisma._lastRequestId;
    }

    return undefined;
  }

  /**
   * Attaches the logger to Prisma client events
   */
  attachLoggerToPrisma(prisma: any): void {
    // For query events
    prisma.$on('query', (e: QueryEvent) => {
      // Используем расширенный метод с передачей экземпляра prisma
      const requestId = this.getCurrentRequestId(prisma);

      // Сформируем объект с данными для JSON части лога
      const logData: Record<string, any> = {};

      // Если есть ID запроса, добавляем его в логи
      if (requestId) {
        logData.req = { id: requestId };
      }

      // Добавляем дополнительную информацию о запросе
      logData.duration = `${e.duration}ms`;

      // Параметры запроса (если есть и не пустые)
      if (e.params && e.params !== '[]') {
        try {
          logData.params = JSON.parse(e.params);
        } catch {
          logData.params = e.params;
        }
      }

      // Формируем строку лога: "SQL-запрос [JSON с meta данными]"
      const logMessage = `${e.query}`;

      // Логируем с JSON объектом в конце
      this.logger.debug(`${logMessage} ${JSON.stringify(logData)}`);
    });

    // For warning events
    prisma.$on('warn', (e: LogEvent) => {
      const requestId = this.getCurrentRequestId();
      const logMessage = e.message;

      if (requestId) {
        this.logger.warn(`${logMessage} {"req":{"id":"${requestId}"}}`);
      } else {
        this.logger.warn(logMessage);
      }
    });

    // For error events
    prisma.$on('error', (e: LogEvent) => {
      const requestId = this.getCurrentRequestId();
      const logMessage = e.message;

      if (requestId) {
        this.logger.error(`${logMessage} {"req":{"id":"${requestId}"}}`);
      } else {
        this.logger.error(logMessage);
      }
    });
  }
}
