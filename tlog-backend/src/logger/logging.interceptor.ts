import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CorrelationIdService } from './correlation-id.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private correlationService: CorrelationIdService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || '';
    const correlationId = this.correlationService.getCorrelationId();

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (res: any) => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const contentLength = response.getHeader('content-length') || 0;
          const responseTime = Date.now() - now;

          this.logger.log(
            `[${correlationId}] ${method} ${url} ${statusCode} ${responseTime}ms - ${contentLength} bytes - ${ip} ${userAgent}`
          );
        },
        error: (error) => {
          const statusCode = error.status || 500;
          const responseTime = Date.now() - now;

          this.logger.error(
            `[${correlationId}] ${method} ${url} ${statusCode} ${responseTime}ms - Error: ${error.message} - ${ip} ${userAgent}`,
            error.stack
          );
        },
      }),
    );
  }
}
