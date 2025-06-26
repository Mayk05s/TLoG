import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

export async function setupApp(app: NestFastifyApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
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
