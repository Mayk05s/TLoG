import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { classToPlain } from 'class-transformer';
import { SerializationGroup } from '../common/enums/serialization-group.enum';

@Injectable()
export class GroupsInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: string } | undefined;

    // Build groups array based on user context
    const groups = [SerializationGroup.PUBLIC];

    // Add auth group for authenticated users OR for auth endpoints (login/signup)
    if (user || this.isAuthEndpoint(request)) {
      groups.push(SerializationGroup.AUTH);
    }

    // Check if user is accessing their own resource
    const targetUserId = request.params.id;
    if (user && targetUserId && user.id === targetUserId) {
      groups.push(SerializationGroup.SELF);
    }

    if (user?.role === 'admin') {
      groups.push(SerializationGroup.ADMIN);
    }

    return next.handle().pipe(
      map(data => {
        if (!data) return data;

        // Convert to plain object with groups
        const result = classToPlain(data, {
          groups,
          excludeExtraneousValues: true,
        });

        console.log('Serialization result:', result);
        return result;
      }),
    );
  }

  private isAuthEndpoint(request: any): boolean {
    const url = request.url || request.originalUrl || '';
    return (
      url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/refresh')
    );
  }
}
