import yargs from 'yargs';
import { prompt } from 'enquirer';
import path from 'path';
import { parsePage } from './src/browser';
import { registerSafeExit, exit } from './src/controller';
import { log } from './src/terminal';
import { downloadFile } from './src/network';

registerSafeExit();

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
    ]);

    return downloadFile(url, path.resolve(__dirname, dir, `${title}.mp4`));
}

async function askQuestions({ manifest, title: defaultTitle }) {
    let questions = [
            {
                type: 'select',
                name: 'quality',
                message: 'Pick a quality',
                choices: Object.keys(manifest).map(name => ({ message: `${name}p`, name }))
            },
            {
                type: 'toggle',
                name: 'download',
                message: 'Would you like to download the movie?',
                enabled: 'Yep',
                disabled: 'No',
                initial: true
            }
        ],
        { download, quality } = await prompt(questions);

    if (download) {
        await downloadMovie(manifest[quality], defaultTitle);
    } else {
        log.success(`Here is your movie source: ${manifest[quality]}`);
    }
}

!async function() {
    let result = await parsePage(url, {
        headless: !argv.browser
    }) || {};

    return askQuestions(result);
}();
