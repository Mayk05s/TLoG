import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify';
import {ValidationPipe, Logger} from '@nestjs/common';
import {ConfigService} from './config/config.service';
import {setupSwagger} from './config/swagger.config';

async function bootstrap() {
  // Initialization with FastifyAdapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false, // Disable Fastify's logger as we're using Pino
      disableRequestLogging: true, // Disable built-in request logging, let Pino handle it
      ignoreTrailingSlash: true,
      caseSensitive: false,
      bodyLimit: 10 * 1024 * 1024, // 10MB
    })
  );

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Setup Swagger documentation
  setupSwagger(app);

  // Get port from configuration
  const configService = app.get(ConfigService);
  const port = configService.port;

  // Создаем стандартный NestJS логгер вместо Pino
  const logger = new Logger('Application');

  // Start server and log info
  await app.listen(port, '0.0.0.0');

  // Используем стандартный логгер NestJS
  logger.log(`🚀 Application successfully started on: ${await app.getUrl()}`);
}

bootstrap().catch(err => {
  console.error('Error during application bootstrap:', err);
  process.exit(1);
});
