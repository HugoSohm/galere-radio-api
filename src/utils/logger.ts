import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const loggerConfig = {
    level: process.env.LOG_LEVEL || 'info',
    transport: isProduction ? undefined : {
        target: 'pino-pretty',
        options: {
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
        },
    },
};

const logger = pino(loggerConfig);

export default logger;
