/* eslint-disable no-magic-numbers */

import yargs from 'yargs';
import path from 'path';
import fs from 'fs';
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
    omdb = new OMDB(),
    crawler = new Crawler();

function formatEpisodeUrl(base, season, episode) {
    return `${base}${base.indexOf('?') > -1 ? '&' : '?'}season=${season}&episode=${episode}`;
}

function formatEpisodeFilename(dir, title, season, episode) {
    return path.resolve(process.cwd(), dir, title, `season ${season}`, `${title}.s${season}e${episode}.mp4`);
}

// const configFilename = `${process.env.HOME}/.CONFIG`;
const configFilename = '.CONFIG';

!async function() {
    let config;

    try {
        config = yaml.safeLoad(fs.readFileSync(configFilename));
    } catch (err) {
        if (err.code === 'ENOENT') {
            config = { omdbApiKey: await omdb.register() };
            fs.writeFileSync(configFilename, yaml.safeDump(config));
        }
    }

    let settings = await crawler.getPlayerSettings(url),
        { download, quality, title, dir } = await ai.ask(settings);

    if (download === 2) {
        let items = [];

        for (let i = 0; i < settings.episodes.length; i++) {
            let episode = settings.episodes[i],
                page = formatEpisodeUrl(settings.url, settings.season, episode),
                manifest = await crawler.getManifest(page),
                url = manifest && manifest[quality],
                filename = formatEpisodeFilename(dir, title, settings.season, episode);

            url ?
                items.push({ url, filename }) :
                i--;

            terminal.write('', true);
            terminal.info(`Extracting... ${Math.round((i + 1) / settings.episodes.length * 100)}%`, '');
        }

        terminal.write('', true);
        terminal.success('Ok, I\'ve finished extracting. Let\'s download it!');

        items.forEach(({ url, filename }) => net.download(url, filename));
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
