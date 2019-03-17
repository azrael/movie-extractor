import winston from 'winston';

const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console()
    ]
});

export const log = {
    message: msg => { logger.info(msg); },
    error: msg => { logger.error(msg); }
};
