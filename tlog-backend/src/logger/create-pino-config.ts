import {Params} from 'nestjs-pino';
import {ConfigService} from "../config/config.service";
import {randomUUID} from 'crypto';

export const createPinoConfig = (config: ConfigService): Params => {
  const isProd = !config.isDev;

  return {
    pinoHttp: {
      // Set appropriate log level based on environment
      level: isProd ? 'info' : 'debug',

      // Skip health check endpoints
      autoLogging: {
        ignore: (req: any) => req.url === '/health'
      },

      // Configure different transports for dev vs prod
      transport: !isProd ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          levelFirst: true,
          translateTime: 'HH:MM:ss',
          // Формат сообщений только для HTTP запросов
          messageFormat: '{req.method} {req.url} → {res.statusCode} {responseTime}ms',
          ignore: 'pid,hostname,req.headers',
        }
      } : undefined,

      // Упрощенные сериализаторы - только для HTTP логов
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          id: req.id,
        }),
        res: (res) => ({
          statusCode: res.statusCode
        }),
        err: (err) => ({
          message: err.message,
          stack: err.stack
        })
      },
    },

    // Не нужно добавлять исключения для health!
    // forRoutes: ['*'],
    // exclude: ['/health'],
  };
};
