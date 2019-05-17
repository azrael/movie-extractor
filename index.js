/* eslint-disable no-magic-numbers */

import os from 'os';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import yaml from 'js-yaml';
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

function formatEpisodeUrl(base, season, episode) {
    return `${base}${base.indexOf('?') > -1 ? '&' : '?'}season=${season}&episode=${episode}`;
}

function formatEpisodeFilename(dir, title, season, episode) {
    return path.resolve(process.cwd(), dir, title, `season ${season}`, `${title}.s${season}e${episode}.mp4`);
}

function interrupt() {
    browser.close();
}

// const configFilename = `${os.homedir()}/.CONFIG`;
const configFilename = '.CONFIG';

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

    const { download, quality, title, dir } = await ai.ask(settings);

    if (download === 2) {
        let items = [],
            failed = 0,
            attempts = 1,
            msg;

        for (let i = 0; i < settings.episodes.length; i++) {
            let episode = settings.episodes[i],
                page = formatEpisodeUrl(settings.url, settings.season, episode),
                url = (await crawler.getManifest(page) || {})[quality], // eslint-disable-line no-await-in-loop
                filename = formatEpisodeFilename(dir, title, settings.season, episode);

            if (url) {
                items.push({ url, filename, season: settings.season, episode });
                attempts = 1;
            } else if (attempts < 5) {
                i--;
                attempts++;
            } else {
                failed++;
                attempts = 1;
            }

            msg = 'Extracting... ';
            msg += `${Math.round((i + 1) / settings.episodes.length * 100)}%`;
            failed > 0 && (msg += ` (${failed} failed)`);
            terminal.clearLine();
            terminal.info(msg, '');
        }

        terminal.clearLine();
        terminal.success('Ok, I\'ve finished extracting. Let\'s download it!');

        items.forEach(async ({ url, filename, season, episode }) => {
            // net.download(url, filename)
            let res = await omdb.search(title, { season, episode });
            console.log(res);
        });
    } else if (download === 1) {
        let filename = settings.type === 'serial' ?
            formatEpisodeFilename(dir, title, settings.season, settings.episode) :
            path.resolve(process.cwd(), dir, `${title}.mp4`);

        net.download(settings.manifest[quality], filename);
    } else if (download === 0) {
        terminal.success(`Here is your source: ${settings.manifest[quality]}`);
    } else {
        terminal.error('Something went wrong...');
    }

    browser.close();
}();
