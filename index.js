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

const configFilename = process.env.DEV ? '.CONFIG' : `${os.homedir()}/.CONFIG`;

function formatEpisodeFilename(title, season, episode) {
    return `${title}.s${season}e${episode}.mp4`;
}

function formatEpisodePath(dir, title, season, episode) {
    return path.resolve(process.cwd(), dir, title, `season ${season}`, formatEpisodeFilename(title, season, episode));
}

function interrupt() {
    terminal.error('Oh no... This is an emergency program termination');
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
    let config, settings, translation, target, manifest, title;

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

    settings = await crawler.getPlayerSettings(url);
    title = settings.title;

    if (!settings) return interrupt();

    translation = await ai.translation(settings.translations);
    target = settings.formatUrl(translation);
    settings = await crawler.extractVideoInfo(target);
    manifest = await crawler.getManifest(target);

    if (settings.type === 'movie') {
        let info = await ai.video(manifest, title, 'movie');

        prepareFile({
            src: manifest[info.quality],
            dest: path.resolve(process.cwd(), info.dir, `${info.title}.mp4`),
            title: info.title
        });
    }

    if (settings.type === 'serial') {
        let info = await ai.video(manifest, title, 'serial'),
            download = await ai.series(),
            seasons = settings.seasons,
            req = [];

        if (download === 'last') {
            seasons = seasons.slice(-1);
        }

        if (download === 'seasons') {
            seasons = await ai.seasons(seasons);
        }

        for (let i = 0; i < seasons.length; i++) {
            let season = seasons[i],
                target = settings.formatUrl(translation, { season }),
                info = await crawler.extractVideoInfo(target); // eslint-disable-line no-await-in-loop

            req = req.concat(info.episodes.map(episode => ({ season, episode })));
        }

        if (download === 'last') {
            req = req.slice(-1);
        }

        if (download === 'custom') {
            let selected = await ai.episodes(req);

            req = selected.map(i => req[i]);
        }

        terminal.info('Extracting...', '');

        for (let i = 0; i < req.length; i++) {
            let { season, episode } = req[i],
                url = settings.formatUrl(translation, { season, episode });

            url = (await crawler.getManifest(url) || {})[info.quality]; // eslint-disable-line no-await-in-loop

            i === 0 && terminal.clearLine();
            prepareFile({
                src: url,
                dest: formatEpisodePath(info.dir, info.title, season, episode),
                title: info.title,
                options: { season, episode }
            });
        }
    }

    browser.close();
}();
