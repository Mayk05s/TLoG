// This import must be first to load environment variables before anything else
// eslint-disable-next-line import/order
import './load-env'; // Import and execute directly
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createFastifyAdapter, setupApp } from '../src/app.setup';

/**
 * Shared prisma client for tests
 */
export const prisma = new PrismaClient();

/**
 * Creates a NestJS application for testing
 * Uses the same configuration as the production application
 */
export async function createTestingApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter());
  await setupApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

export async function closeTestingApp(app: NestFastifyApplication): Promise<void> {
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await new Promise<void>(resolve => {
    fastifyInstance.close(() => resolve());
  });

  await app.close();
}
