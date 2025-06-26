import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { createFastifyAdapter, setupApp } from './app.setup';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, createFastifyAdapter());
  await setupApp(app);
  setupSwagger(app);

  const configService = app.get(ConfigService);
  const port = configService.port;

  const logger = new Logger('Application');
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Application successfully started on: ${await app.getUrl()}`);
}

bootstrap().catch(err => {
  console.error('Error during application bootstrap:', err);
  process.exit(1);
});
