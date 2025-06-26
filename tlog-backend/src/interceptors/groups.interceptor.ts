import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';
import { SerializationGroup } from '../common/enums/serialization-group.enum';

@Injectable()
export class GroupsInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role: string } | undefined;

    return next.handle().pipe(
      map(data => {
        if (!data) return data;

        // Build groups array based on user context and data
        const groups = [SerializationGroup.PUBLIC];

        // For auth endpoints, we need to check the response data role and add groups accordingly
        if (this.isAuthEndpoint(request)) {
          groups.push(SerializationGroup.AUTH);

          // For auth endpoints, if the user being returned is admin, add ADMIN group
          if (data.user?.role === 'admin') {
            groups.push(SerializationGroup.ADMIN);
          }
        } else {
          // For regular endpoints, use request.user context
          if (user) {
            groups.push(SerializationGroup.AUTH);
          }

          if (user?.role === 'admin') {
            groups.push(SerializationGroup.ADMIN);
          }

          // Check if user is accessing their own resource
          const targetUserId = request.params.id;
          if (user && targetUserId && user.id === targetUserId) {
            groups.push(SerializationGroup.SELF);
          }
        }

        // Convert to plain object with groups
        return instanceToPlain(data, {
          groups,
          excludeExtraneousValues: true,
        });
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
