import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';
import { SerializationGroup } from '../common/enums/serialization-group.enum';

@Injectable()
export class GroupsInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id: string; role: string } | undefined;

    try {
      /* базовый набор */
      const groups: string[] = [SerializationGroup.PUBLIC];
      if (user) groups.push(SerializationGroup.AUTH);
      if (user?.role === 'admin') groups.push(SerializationGroup.ADMIN);

      /* === выявляем self === */
      const targetIdParam = req.params.id; // /users/:id
      if (user && targetIdParam && targetIdParam === user.id) {
        groups.push(SerializationGroup.SELF);
      }

      // Special case: profile endpoint - user is always accessing their own data
      if (this.isProfileEndpoint(req) && user) {
        if (!groups.includes(SerializationGroup.SELF)) {
          groups.push(SerializationGroup.SELF);
        }
      }

      // если контроллер вернёт один объект, можно безопасно проверить body.id
      return next.handle().pipe(
        map(data => {
          if (!data) return data;

          try {
            // если это массив — не трогаем, если объект и у него id совпадает с user.id
            if (Array.isArray(data)) {
              return instanceToPlain(data, {
                groups,
                excludeExtraneousValues: true,
              });
            }

            // Проверяем, принадлежит ли объект пользователю
            if (user && (data.id === user.id || data.ownerId === user.id)) {
              if (!groups.includes(SerializationGroup.SELF)) {
                groups.push(SerializationGroup.SELF);
              }
            }

            // For auth endpoints, check if the response contains admin user
            if (this.isAuthEndpoint(req) && data.user?.role === 'admin') {
              if (!groups.includes(SerializationGroup.ADMIN)) {
                groups.push(SerializationGroup.ADMIN);
              }
            }

            const result = instanceToPlain(data, {
              groups,
              excludeExtraneousValues: true,
            });

            return result;
          } catch (serializationError) {
            console.error('GroupsInterceptor serialization error:', {
              error: serializationError.message,
              stack: serializationError.stack,
              url: req.url,
              method: req.method,
              dataType: typeof data,
              dataConstructor: data?.constructor?.name,
              groups,
            });
            // Re-throw to maintain error handling
            throw serializationError;
          }
        }),
      );
    } catch (interceptorError) {
      console.error('GroupsInterceptor initialization error:', {
        error: interceptorError.message,
        stack: interceptorError.stack,
        url: req.url,
        method: req.method,
      });
      // Return the original stream if interceptor fails
      return next.handle();
    }
  }

  private isAuthEndpoint(request: any): boolean {
    const url = request.url || request.originalUrl || '';
    return (
      url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/refresh')
    );
  }

  private isProfileEndpoint(request: any): boolean {
    const url = request.url || request.originalUrl || '';
    return url.includes('/auth/profile');
  }
}
