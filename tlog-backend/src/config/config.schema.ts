import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  // Добавьте другие переменные окружения по мере необходимости
});

export type ConfigSchema = z.infer<typeof configSchema>;
