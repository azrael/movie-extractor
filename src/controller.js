import { log } from './terminal';

export function exit(code = 1) {
    process.exit(code);
}

function cleanup() {}

export function registerSafeExit({ uncaughtException = false } = {}) {
    // Catches Ctrl+C event
    process.on('SIGINT', exit);

    // Catches "kill pid" (for example, nodemon restart)
    process.on('SIGUSR1', exit);
    process.on('SIGUSR2', exit);

    // Catches uncaught exceptions
    uncaughtException && process.on('uncaughtException', err => {
        log.error(err);
        exit();
    });

    process.on('exit', cleanup);
}
