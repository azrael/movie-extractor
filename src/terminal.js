import { eraseLines, eraseLine, cursorLeft } from 'ansi-escapes';
import termSize from 'term-size';
import colors from 'ansi-colors';

const symbols = {
    success: colors.green(colors.symbols.check),
    fail: colors.magenta(colors.symbols.cross),
    info: colors.blueBright(colors.symbols.bullet)
};

class Terminal {
    write(msg, erase) {
        process.stderr.write(`${erase ? eraseLine : ''}${msg}`);
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

    clear(lines = 0) {
        this.write(eraseLines(lines));
    }
}

const terminal = new Terminal();

export default terminal;
