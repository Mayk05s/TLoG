import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  batchSize: number;
  batchTimeoutSeconds: number;
  instanceId: string;
  lockTtlMs: number;
}

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    batchTimeoutSeconds: parseInt(process.env.BATCH_TIMEOUT_SECONDS || '10', 10),
    instanceId:
      process.env.INSTANCE_ID || `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    lockTtlMs: parseInt(process.env.BATCH_LOCK_TTL_MS || '5000', 10),
  }),
);
