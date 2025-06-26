// This import must be first to load environment variables before anything else
// eslint-disable-next-line import/order
import './load-env'; // Import and execute directly
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * Shared prisma client for tests
 */
export const prisma = new PrismaClient();

/**
 * Creates a NestJS application for testing
 */
export async function createTestingApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return app;
}
