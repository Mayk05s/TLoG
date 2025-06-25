import { Injectable, Logger } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { RequestContextStorage } from './request-context-storage';

/**
 * Service that provides access to the current request's context,
 * particularly the request ID set by Pino.
 */
@Injectable()
export class RequestContextService {
  private readonly logger = new Logger('RequestContextService');

  constructor(private readonly pinoLogger: PinoLogger) {
    this.pinoLogger.setContext('RequestContext');
  }

  /**
   * Gets the request ID from the current Pino logger context
   */
  getRequestId(): string | undefined {
    try {
      // Сначала пытаемся получить ID из AsyncLocalStorage
      const storageRequestId = RequestContextStorage.getRequestId();
      this.logger.debug(`AsyncLocalStorage requestId: ${storageRequestId}`);

      if (storageRequestId) {
        return storageRequestId;
      }

      // Если нет в AsyncLocalStorage, пытаемся получить из Pino
      const bindings = this.pinoLogger.logger.bindings();
      this.logger.debug(`Pino bindings: ${JSON.stringify(bindings)}`);

      // Проверяем оба формата, которые может использовать Pino
      if (bindings.req && bindings.req.id) {
        this.logger.debug(`Using req.id from Pino bindings: ${bindings.req.id}`);
        return bindings.req.id;
      } else if (bindings.reqId) {
        this.logger.debug(`Using reqId from Pino bindings: ${bindings.reqId}`);
        return bindings.reqId;
      }

      this.logger.warn(`No request ID found in context`);
      return undefined;
    } catch (e) {
      this.logger.error(`Error getting request ID: ${e.message}`, e.stack);
      return undefined;
    }
  }
}
