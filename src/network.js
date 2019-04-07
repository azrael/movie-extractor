/* eslint-disable no-magic-numbers */

import fs from 'fs';
import request from 'request';
import progress from 'request-progress';
import colors from 'ansi-colors';
import { writeLine, getSize, log } from './terminal';

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

function onProgress({ percent, speed, time: { remaining } }) {
    let { columns } = getSize(),
        done = Math.round(columns * percent),
        msg = '  ',
        parts;

    msg += f(`${Math.round(percent * 100)}%`);
    msg += f(`ETA ${formatTime(Math.round(remaining))}`);
    msg += f(formatSpeed(speed));

    parts = [
        `${msg}${' '.repeat(done)}`.slice(0, done),
        `${msg.slice(done)}${' '.repeat(columns - done)}`.slice(0, columns - done)
    ];

    writeLine(colors.bold.bgBlueBright.white(parts[0]) + colors.bold.white(parts[1]));
}

export function downloadFile(url, path) {
    log.info('Start downloading...', '');

    return progress(request(url), { throttle: 500 })
        .on('progress', onProgress)
        .on('error', err => log.error(`Something went wrong...\n\n${err}`))
        .on('end', () => log.success('Download finished!'))
        .pipe(fs.createWriteStream(path));
}
