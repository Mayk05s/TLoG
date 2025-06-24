import { utilities as nestWinstonModuleUtilities, WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

export const createWinstonConfig = (configService: ConfigService): WinstonModuleOptions => {
  const isProd = process.env.NODE_ENV === 'production';

  // Base format that applies to all transports
  const baseFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
  );

  // Development format - colorized console output
  const devFormat = winston.format.combine(
    baseFormat,
    nestWinstonModuleUtilities.format.nestLike('TLoG API', {
      colors: true,
      prettyPrint: true,
    }),
  );

  // Production format - JSON for structured logging
  const prodFormat = winston.format.combine(
    baseFormat,
    winston.format.json(),
  );

  return {
    transports: [
      new winston.transports.Console({
        format: isProd ? prodFormat : devFormat,
        level: isProd ? 'info' : 'debug',
      }),
      // Optional file transport - uncomment if needed for production
      // ...(isProd ? [
      //   new winston.transports.File({
      //     filename: 'logs/error.log',
      //     level: 'error',
      //     format: prodFormat,
      //   }),
      //   new winston.transports.File({
      //     filename: 'logs/combined.log',
      //     format: prodFormat,
      //   }),
      // ] : []),
    ],
  };
};
