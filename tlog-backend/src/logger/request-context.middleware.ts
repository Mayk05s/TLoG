import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestContextStorage } from './request-context-storage';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestContext');

  use(req: Request, res: Response, next: NextFunction) {
    // Check if the request already has an ID
    if (!req['id']) {
      const generatedId = 'req-' + randomUUID();
      this.logger.warn(`Request ID not provided, generated new UUID: ${generatedId}`);
      req['id'] = generatedId;
    }

    const requestId = String(req['id']);
    RequestContextStorage.run(requestId, () => {
      next();
    });
  }
}
