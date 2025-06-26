import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Reflector } from '@nestjs/core';
import { GroupsInterceptor } from './interceptors/groups.interceptor';

export async function setupApp(app: NestFastifyApplication) {
  const reflector = app.get(Reflector);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global serialization interceptors
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, {
      strategy: 'excludeAll',
      excludeExtraneousValues: true,
    }),
    new GroupsInterceptor(reflector),
  );

  app.enableCors();
}

export function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({
    logger: false, // Disable Fastify's logger as we're using Pino
    disableRequestLogging: true,
    ignoreTrailingSlash: true,
    caseSensitive: false,
    bodyLimit: 10 * 1024 * 1024, // 10MB
  });
}
