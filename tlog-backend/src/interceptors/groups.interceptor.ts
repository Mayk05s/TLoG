import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class GroupsInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: string } | undefined;

    // Build groups array based on user context
    const groups = ['public'];

    if (user) {
      groups.push('auth');
    }

    if (user?.role === 'admin') {
      groups.push('admin');
    }

    // Check if user is accessing their own resource
    if (user && request.params.id && user.id === request.params.id) {
      groups.push('self');
    }

    return next.handle().pipe(
      map(data => {
        if (!data) return data;

        // Handle arrays of objects
        if (Array.isArray(data)) {
          return data.map(item => plainToInstance(item.constructor, item, { groups }));
        }

        // Handle single objects
        return plainToInstance(data.constructor, data, { groups });
      }),
    );
  }
}
