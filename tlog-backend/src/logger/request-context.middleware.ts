import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextStorage } from './request-context-storage';

/**
 * Middleware для установки контекста запроса с ID запроса
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestContextMiddleware');

  use(req: Request, res: Response, next: NextFunction) {
    // Получаем ID запроса из заголовка или генерируем новый
    // Явно приводим к строке, чтобы гарантировать совместимость типов
    const rawReqId = req['id'] || req.headers['x-request-id'] || 'req-' + Math.random().toString(36).substring(2, 15);
    const requestId = String(rawReqId);

    this.logger.debug(`Request ID before setting context: ${requestId}, req.id=${req['id']}, headers=${JSON.stringify(req.headers)}`);

    // Запускаем запрос в контексте с этим ID
    RequestContextStorage.run(requestId, () => {
      // Добавляем ID запроса в объект запроса для совместимости
      req['id'] = requestId;

      // Проверяем, что ID действительно установлен в хранилище
      const storedId = RequestContextStorage.getRequestId();
      this.logger.debug(`Request ID stored in context: ${storedId}`);

      next();
    });
  }
}
