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
});
