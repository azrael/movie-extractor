import { eraseLines, eraseLine, cursorLeft } from 'ansi-escapes';
import termSize from 'term-size';
import colors from 'ansi-colors';

const symbols = {
    success: colors.green(colors.symbols.check),
    fail: colors.magenta(colors.symbols.cross),
    info: colors.blueBright(colors.symbols.bullet)
};

class Terminal {
    write(msg) {
        process.stderr.write(msg);
    }

    log(type, msg, delimiter = '\n') {
        this.write(`${cursorLeft}${symbols[type] || ' '} ${colors.bold.white(msg)}${delimiter}`);
    }

    success(...args) { this.log('success', ...args); }

    error(...args) { this.log('fail', ...args); }

    info(...args) { this.log('info', ...args); }

    size() {
        return termSize();
    }

    clearLines(lines = 0) {
        this.write(eraseLines(lines));
    }

    clearLine() {
        this.write(eraseLine);
    }
}

const terminal = new Terminal();

export default terminal;
