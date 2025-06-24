
import { Params } from 'nestjs-pino';
import {ConfigService} from "../config/config.service";


export const createPinoConfig = (cfg: ConfigService): Params => {
    const isProd = !!cfg.isDev

    const pinoHttp: NonNullable<Params['pinoHttp']> = {
        level:  isProd ? 'info' : 'debug',
        // autoLogging: { ignore: (req: any) => req.url === '/health' },
        customLogLevel: (req, res, err) => {
            if (err || res.statusCode >= 500) return 'error';
            if (res.statusCode >= 400)        return 'debug';
            return 'info';
        },
        transport: !isProd
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    singleLine: true,
                    levelFirst: true,
                    translateTime: 'HH:MM:ss',
                    ignore:'pid,hostname,req.headers,req.remoteAddress,req.remotePort,req.query,res.headers',
                    // messageFormat: '{context} {req.method:-} {req.url:-} → {res.statusCode:-} {responseTime:-}ms {msg}',

                    messageFormat: '{req.method} {req.url} → {res.statusCode} {responseTime}ms',
                },
            } : undefined,


        formatters: {
            level(label: string) {
                return { level: label };
            },
        },
    };

    return { pinoHttp };
};
