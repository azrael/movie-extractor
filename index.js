/* eslint-disable no-magic-numbers */

import os from 'os';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import yaml from 'js-yaml';
import { spawn } from 'child_process';
import { registerSafeExit, exit } from './src/controller';
import Browser from './src/browser';
import Crawler from './src/crawler';
import Network from './src/network';
import OMDB from './src/omdb';
import ai from './src/ai';
import terminal from './src/terminal';

registerSafeExit();

const argv = yargs
    .detectLocale(false)
    .usage('$0 [options] <url>')
    .option('browser', {
        describe: 'Use full browser instead of headless (useful for debugging)',
        default: false,
        type: 'boolean'
    })
    .option('threads', {
        describe: 'How many parallel downloads are allowed. It\'s relevant for the case of the TV series.',
        default: 2,
        type: 'number'
    })
    .help()
    .version(false)
    .argv;

const { threads, _: [url] } = argv;

if (!url) {
    yargs.showHelp();
    exit();
}

const net = new Network({ threads }),
    browser = new Browser({ headless: !argv.browser }),
    omdb = new OMDB(browser),
    crawler = new Crawler(browser);

// const configFilename = `${os.homedir()}/.CONFIG`;
const configFilename = '.CONFIG';

function formatEpisodeFilename(title, season, episode) {
    return `${title}.s${season}e${episode}.mp4`;
}

function formatEpisodePath(dir, title, season, episode) {
    return path.resolve(process.cwd(), dir, title, `season ${season}`, formatEpisodeFilename(title, season, episode));
}

function interrupt() {
    browser.close();
}

async function prepareFile({ src, dest, title, options = {} }) {
    let [ready, tags] = await Promise.all([
        net.download(src, dest),
        omdb.search(title, options)
    ]);

    if (ready && tags) {
        spawn('python', [
            path.resolve(__dirname, 'py/metadata.py'),
            dest,
            JSON.stringify(tags)
        ]);
    }
}

!async function() {
    let config;

    try {
        config = yaml.safeLoad(fs.readFileSync(configFilename));
        omdb.setup(config.omdbApiKey);
    } catch (err) {
        if (err.code === 'ENOENT') {
            terminal.info('Wait a minute, I need to initialize launch settings...', '');
            config = { omdbApiKey: await omdb.register() };
            fs.writeFileSync(configFilename, yaml.safeDump(config));
            terminal.clearLine();
        }
    }

    const settings = await crawler.getPlayerSettings(url);

    if (!settings) return interrupt();

    const { download, quality, title, dir } = await ai.ask(settings),
        season = settings.season;

    if (download === 2) {
        terminal.info('Extracting...', '');

        for (let i = 0; i < settings.episodes.length; i++) {
            let episode = settings.episodes[i],
                url = (await crawler.getEpisodeManifest(settings.url, season, episode) || {})[quality]; // eslint-disable-line no-await-in-loop

            i === 0 && terminal.clearLine();
            prepareFile({
                src: url,
                dest: formatEpisodePath(dir, title, season, episode),
                title,
                options: { season, episode }
            });
        }
    } else if (download === 1) {
        let filename = `${title}.mp4`,
            options = {};

        if (settings.type === 'serial') {
            filename = formatEpisodeFilename(title, settings.season, settings.episode);
            options = { season, episode: settings.episode };
        }

        prepareFile({
            src: settings.manifest[quality],
            dest: path.resolve(process.cwd(), dir, filename),
            title,
            options
        });
    } else if (download === 0) {
        terminal.success(`Here is your source: ${settings.manifest[quality]}`);
    } else {
        terminal.error('Something went wrong...');
    }

    browser.close();
}();
