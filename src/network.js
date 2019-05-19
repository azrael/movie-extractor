/* eslint-disable no-magic-numbers */

import fs from 'fs';
import path from 'path';
import request from 'request';
import progress from 'request-progress';
import colors from 'ansi-colors';
import terminal from './terminal';

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

const units = [
    { unit: 'GB', k: 2 ** 30 },
    { unit: 'MB', k: 2 ** 20 },
    { unit: 'KB', k: 2 ** 10 },
    { unit: 'B', k: 1 }
];

function formatSize(value) {
    if (!value) return '0 B';

    let { unit, k } = units.find(({ k }) => value >= k);

    return `${(value / k).toFixed(1)} ${unit}`;
}

function formatSpeed(value) {
    if (!value) return '0 B/s';

    let { unit, k } = units.find(({ k }) => value >= k);

    return `${(value / k).toFixed(1)} ${unit}/s`;
}

function drawProgress(name, { percent, speed, time: { remaining }, size: { transferred } }) {
    let { columns } = terminal.size(),
        done = Math.round(columns * percent),
        suffix = [
            `${Math.round(percent * 100)}%`.padEnd(7),
            formatSize(transferred).padEnd(12),
            formatSpeed(speed).padEnd(15),
            `ETA ${formatTime(Math.round(remaining))}`.padEnd(12)
        ]
            .join(''),
        maxLength = columns - suffix.length - 5,
        msg,
        parts;

    if (name.length > maxLength) {
        name = `${name.slice(0, maxLength - 1)}…`;
    }

    msg = `  ${name.padEnd(maxLength)}   ${suffix}`;

    parts = [
        `${msg}${' '.repeat(done)}`.slice(0, done),
        `${msg.slice(done)}${' '.repeat(columns - done)}`.slice(0, columns - done)
    ];

    terminal.clearLine();
    terminal.write(colors.bold.bgBlueBright.white(parts[0]) + colors.bold.white(parts[1]));
}

class DownloadItem {
    constructor(url, filename, onFinish) {
        this.url = url;
        this.filename = filename;
        this.name = path.basename(filename);
        this.status = 'queued';
        this.state = null;
        this.onFinish = onFinish || (() => {});
    }

    onProgress = state => { this.state = state; };

    onError = err => {
        this.status = 'error';
        this.onFinish(err);
    };

    onEnd = () => {
        this.status = 'done';
        this.onFinish();
    };

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
                terminal.info(`${this.name} is queued for download...`, '');
                break;
            case 'progress':
                this.state ?
                    drawProgress(this.name, this.state) :
                    terminal.info(`Start downloading of ${this.name}...`, '');
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

        return new Promise(resolve => {
            this.#queue.push(new DownloadItem(url, filename, err => resolve(!err)));
            if (!this.#timer) this.tick();
        });
    }
}

export default Network;
