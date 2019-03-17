export function exit(code = 1) {
    process.exit(code);
}

function cleanup() {}

// Catches Ctrl+C event
process.on('SIGINT', exit);

// Catches "kill pid" (for example, nodemon restart)
process.on('SIGUSR1', exit);
process.on('SIGUSR2', exit);

// Catches uncaught exceptions
process.on('uncaughtException', exit);

process.on('exit', cleanup);
