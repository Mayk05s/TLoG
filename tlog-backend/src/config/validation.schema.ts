import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application configuration
  PORT: Joi.number().optional(),
  ROUND_DURATION: Joi.number().required(),
  COOLDOWN_DURATION: Joi.number().required(),

  // Database connection parameters
  DB_HOST: Joi.string().optional(),
  DB_PORT: Joi.number().optional(),
  DB_NAME: Joi.string().optional(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),

  // Authentication
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().optional(),

  // Redis configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),
  INSTANCE_ID: Joi.string().optional(),
  BATCH_LOCK_TTL_MS: Joi.number().default(5000),

  // Batching configuration
  BATCH_SIZE: Joi.number().default(100),
  BATCH_TIMEOUT_SECONDS: Joi.number().default(10),
});
