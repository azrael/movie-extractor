/* eslint-disable no-magic-numbers */

import fs from 'fs';
import path from 'path';
import request from 'request';
import progress from 'request-progress';
import colors from 'ansi-colors';
import terminal from './terminal';

function prepareMessageBlock(msg, len = 16) {
    return `${msg}${' '.repeat(len)}`.slice(0, len);
}

const f = prepareMessageBlock;

function formatTime(seconds) {
    let hours = Math.floor(seconds / 3600),
        minutes = Math.floor(seconds / 60),
        res = [];

    seconds = seconds % 60;

    hours > 0 && res.push(`${hours}h`);
    (minutes > 0 || hours > 0) && res.push(`${minutes}m`);
    res.push(`${seconds}s`);

    return res.slice(0, 2).join('');
}

const speedUnits = [
    { unit: 'GB', k: 2 ** 30 },
    { unit: 'MB', k: 2 ** 20 },
    { unit: 'KB', k: 2 ** 10 },
    { unit: 'B', k: 1 }
];

function formatSpeed(value) {
    if (!value) return '0 B/s';

    let { unit, k } = speedUnits.find(({ k }) => value >= k);

    return `${Math.round(value / k)} ${unit}/s`;
}

function drawProgress(name, { percent, speed, time: { remaining } }) {
    let { columns } = terminal.size(),
        done = Math.round(columns * percent),
        msg = '  ',
        parts;

    msg += name ? `${name}${' '.repeat(8)}` : '';
    msg += f(`${Math.round(percent * 100)}%`);
    msg += f(`ETA ${formatTime(Math.round(remaining))}`);
    msg += f(formatSpeed(speed));

    parts = [
        `${msg}${' '.repeat(done)}`.slice(0, done),
        `${msg.slice(done)}${' '.repeat(columns - done)}`.slice(0, columns - done)
    ];

    terminal.clearLine();
    terminal.write(colors.bold.bgBlueBright.white(parts[0]) + colors.bold.white(parts[1]));
}

class DownloadItem {
    constructor(url, filename) {
        this.url = url;
        this.filename = filename;
        this.name = path.basename(filename);
        this.status = 'queued';
        this.state = null;
    }

    onProgress = state => { this.state = state; };

    onError = () => { this.status = 'error'; };

    onEnd = () => { this.status = 'done'; };

    start() {
        this.status = 'progress';
        progress(request(this.url), { throttle: 500 })
            .on('progress', this.onProgress)
            .on('error', this.onError)
            .on('end', this.onEnd)
            .pipe(fs.createWriteStream(this.filename));
    }

    print() {
        switch (this.status) {
            case 'queued':
                terminal.info(`${this.name} queued for download...`, '');
                break;
            case 'progress':
                this.state ?
                    drawProgress(this.name, this.state) :
                    terminal.info(`Start downloading ${this.name}...`, '');
                break;
            case 'done':
                terminal.success(`Download of ${this.name} is finished!`, '');
                break;
            case 'error':
                terminal.error(`Something went wrong with ${this.name}...`, '');
                break;
        }

        terminal.write('\n');
    }
}

class Network {
    constructor({ threads = 1 } = {}) {
        this.threads = threads;
    }

    #queue = [];

    #timer = null;

    #total = 0;

    stat() {
        return this.#queue.reduce((memo, item) => {
            if (item.status === 'queued') {
                !memo.next && (memo.next = item);
                memo.rest++;
            }

            if (item.status === 'progress') {
                memo.count++;
                memo.rest++;
            }

            return memo;
        }, { next: null, count: 0, rest: 0 });
    }

    tick() {
        let { next, count, rest } = this.stat();

        terminal.clearLines(this.#total + 1);

        this.#total = this.#queue.length;

        while (count < this.threads && next) {
            next.start();

            let stat = this.stat();

            next = stat.next;
            count = stat.count;
        }

        this.#queue.forEach(item => item.print());

        rest > 0 && (this.#timer = setTimeout(() => this.tick(), 500));
    }

    async download(url, filename) {
        if (!url || !filename) return;

        await new Promise(resolve => {
            fs.mkdir(path.dirname(filename), { recursive: true }, err => {
                if (err) throw err;
                resolve();
            });
        });

        this.#queue.push(new DownloadItem(url, filename));

        if (!this.#timer) {
            this.tick();
        }
    }
}

export default Network;
