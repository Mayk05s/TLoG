import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

export async function setupApp(app: NestFastifyApplication) {
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: ['https://tlog.mayk05.pro', 'http://localhost:3000'],
    credentials: true,
  });
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
