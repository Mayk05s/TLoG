import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { buildSwaggerDocument } from './swagger/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting minimal TLoG backend...');

    // Create Fastify adapter
    const fastifyAdapter = new FastifyAdapter({
      logger: true,
    });

    // Create NestJS application
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      fastifyAdapter,
    );

    // Set up global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));

    // Get configuration
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') || 3000;

    // Log database connection string (masked)
    const dbUrl = configService.get('database.url') as string;
    if (dbUrl) {
      const maskedUrl = dbUrl.replace(/\/\/([^:]+):[^@]+@/, '//***:***@');
      logger.log(`Database URL: ${maskedUrl}`);
    } else {
      logger.error('DATABASE_URL is missing or invalid');
    }

    // Set up Prisma
    try {
      const prismaService = app.get(PrismaService);
      await prismaService.enableShutdownHooks(app);
      logger.log('Prisma service initialized');
    } catch (error) {
      logger.error(`Failed to initialize Prisma service: ${error.message}`);
    }

    // Set up Swagger
    try {
      const openApi = buildSwaggerDocument(app);
      SwaggerModule.setup('docs', app, openApi);
      logger.log('Swagger documentation available at /docs');
    } catch (error) {
      logger.error(`Failed to initialize Swagger: ${error.message}`);
    }

    // Enable CORS
    app.enableCors({ origin: true, credentials: true });

    // Start the server
    await app.listen(port, '0.0.0.0');
    logger.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    logger.error(`Application failed to start: ${error.message}`);
    process.exit(1);
  }
}
bootstrap();
