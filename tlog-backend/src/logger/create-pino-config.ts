import {Params} from 'nestjs-pino';
import {ConfigService} from "../config/config.service";

export const createPinoConfig = (config: ConfigService): Params => {
  const isProd = !config.isDev;

  return {
    pinoHttp: {
      level: isProd ? 'info' : 'debug',
      transport: !isProd ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          levelFirst: true,
          translateTime: 'HH:MM:ss',
          messageFormat: '{context} {msg} {req.method} {req.url} → {res.statusCode} {responseTime}ms ({req.id})',
          ignore: 'pid,hostname,req.headers',
        }
      } : undefined,
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
    }
  };
};
