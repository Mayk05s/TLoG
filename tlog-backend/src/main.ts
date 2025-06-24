import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify';
import {ValidationPipe} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {WINSTON_MODULE_NEST_PROVIDER} from 'nest-winston';
import {setupSwagger} from './config/swagger.config';
import { CorrelationIdService } from './logger/correlation-id.service';

async function bootstrap() {
  // Initialization with FastifyAdapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      // Performance optimization
      disableRequestLogging: process.env.NODE_ENV === 'production',
      ignoreTrailingSlash: true,
      caseSensitive: false,
      // Increase request body size limit
      bodyLimit: 10 * 1024 * 1024, // 10MB
    }),
  );

  // Get Winston logger from module and correlation ID service
  const winstonLogger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  const correlationService = app.get(CorrelationIdService);

  // Set Winston as the global logger for NestJS
  app.useLogger(winstonLogger);

  // Register Fastify hook to create correlation ID for each request
  app.getHttpAdapter().getInstance().addHook('onRequest', (request, reply, done) => {
    correlationService.run(() => {
      done();
    });
  });

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Setup Swagger documentation (moved to config/swagger.config.ts)
  setupSwagger(app);

  // Get port from configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);

  // Start server and log info
  await app.listen(port, '0.0.0.0');
  winstonLogger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
}

bootstrap().catch(err => {
  console.error('Error during application bootstrap:', err);
  process.exit(1);
});
