#!/usr/bin/env node

const { spawn } = require('child_process'),
    eslintPath = './node_modules/eslint/bin/eslint',
    filenameRegex = /^[AM].+\.jsx?$/,
    status = spawn('git', ['status', '--porcelain']);

let data = Buffer.from([]);

status.stdout.on('data', part => {
    let total = data.length + part.length;

    data = Buffer.concat([data, part], total);
});

status.on('close', code => {
    if (code !== 0) return process.exit(code);

    let files = data
        .toString('utf8')
        .split('\n')
        .reduce((res, item) => {
            filenameRegex.lastIndex = 0;

            if (filenameRegex.test(item)) {
                res.push(`./${item.split(' ').slice(-1)[0]}`);
            }

            return res;
        }, []);

    if (files.length > 0) {
        let lint = spawn('node', [eslintPath, ...files], { stdio: 'inherit' });

        lint.on('close', code => {
            process.exitCode = code;
        });
    }
});
