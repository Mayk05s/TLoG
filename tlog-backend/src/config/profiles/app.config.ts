import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  isDev: boolean;
  roundDuration: number;
  cooldownDuration: number;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    isDev: process.env.NODE_ENV !== 'production',
    roundDuration: parseInt(process.env.ROUND_DURATION ?? '60', 10),
    cooldownDuration: parseInt(process.env.COOLDOWN_DURATION ?? '30', 10),
  }),
);
