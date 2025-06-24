import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required for this route
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false; // User not authenticated
    }

    // Check if user role is in the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
