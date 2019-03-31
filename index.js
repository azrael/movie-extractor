import yargs from 'yargs';
import { prompt } from 'enquirer';
import util from 'util';
import path from 'path';
import { spawn, exec as nodeExec } from 'child_process';
import { parsePage } from './src/browser';
import { registerSafeExit, exit } from './src/controller';
import { log } from './src/logger';

registerSafeExit();

const exec = util.promisify(nodeExec);

const argv = yargs
    .detectLocale(false)
    .usage('$0 [options] <url>')
    .option('browser', {
        describe: 'Use full browser instead of headless (useful for debugging)',
        default: false,
        type: 'boolean'
    })
    .help()
    .version(false)
    .argv;

const [url] = argv._;

if (!url) {
    yargs.showHelp();
    exit();
}

async function downloadMovie(url, defaultTitle) {
    let { title, dir } = await prompt([
            {
                type: 'input',
                name: 'title',
                message: 'Enter the movie title',
                initial: defaultTitle
            },
            {
                type: 'input',
                name: 'dir',
                message: 'Enter the output directory',
                initial: path.resolve(__dirname)
            }
        ]),
        child = spawn('wget', [url, '-O', path.resolve(__dirname, dir, `${title}.mp4`)]);

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    return child;
}

async function askQuestions({ manifest, title: defaultTitle }) {
    let questions = [{
            type: 'select',
            name: 'quality',
            message: 'Pick a quality',
            choices: Object.keys(manifest).map(name => ({ message: `${name}p`, name }))
        }],
        answers;

    try {
        await exec('which wget');

        questions = [
            ...questions,
            {
                type: 'toggle',
                name: 'download',
                message: 'I\'ve found wget. Would you like to download the movie?',
                enabled: 'Yep',
                disabled: 'No',
                initial: true
            }
        ];
    } catch { /**/ }

    answers = await prompt(questions);

    if (answers.download) {
        await downloadMovie(manifest[answers.quality], defaultTitle);
    } else {
        log.message(`Here is your movie source: ${manifest[answers.quality]}`);
    }
}

!async function() {
    let result = await parsePage(url, {
        debug: argv.browser
    }) || {};

    return askQuestions(result);
}();
