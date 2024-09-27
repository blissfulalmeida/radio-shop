const config = require('config');
const winston = require('winston');
const { current } = require('./context');

let consoleTransportAdded = false;

const formatContext = () => {
    const ctx = current();

    if (ctx === null) {
        return '[GLOBAL]';
    }

    switch (ctx.name) {
        case 'http':
            return `[${ctx.data.rid}] [${ctx.data.method.padStart(6)} ${ctx.data.path}]`;
        default:
            return `[${ctx.name}]`;
    }
};

module.exports.createLogger = () => {
    const logger = winston.createLogger({
        exitOnError: false,
    });

    const level = config.get('logLevel');

    logger.add(
        new winston.transports.Console({
            level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format((info) => {
                    info.ctx = formatContext();

                    return info;
                })(),
                winston.format.printf((info) => `${info.timestamp} ${info.level.padStart(16)} ${info.ctx} ${info.label}:  ${info.message}`),
            ),
        }),
    );

    if (consoleTransportAdded === false) {
        consoleTransportAdded = true;

        logger.exceptions.handle(new winston.transports.Console({}));
    }

    return {
        error(message, ...rest) {
            logger.error(message, ...rest);
        },
        warn(message, ...rest) {
            logger.warn(message, ...rest);
        },
        info(message, ...rest) {
            logger.info(message, ...rest);
        },
        debug(message, ...rest) {
            logger.debug(message, ...rest);
        },
    };
};
