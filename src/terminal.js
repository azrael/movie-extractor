import { cursorLeft, eraseLine } from 'ansi-escapes';
import termSize from 'term-size';
import colors from 'ansi-colors';

const symbols = {
    success: colors.green(colors.symbols.check),
    fail: colors.magenta(colors.symbols.cross),
    info: colors.blueBright(colors.symbols.bullet)
};

export function writeLine(msg) {
    process.stderr.write(`${eraseLine}${cursorLeft}${msg}`);
}

function writeLogLine(type, msg, delimiter = '\n') {
    writeLine(`${symbols[type]} ${colors.bold.white(msg)}${delimiter}`);
}

export const log = {
    success: (...args) => writeLogLine('success', ...args),
    error: (...args) => writeLogLine('fail', ...args),
    info: (...args) => writeLogLine('info', ...args)
};

export function getSize() {
    return termSize();
}
