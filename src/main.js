import path from 'path';
import yargs from 'yargs';
import { spawn } from 'child_process';
import { registerSafeExit, exit } from './controller';
import Browser from './browser';
import Player from './player';
import Network from './network';
import IMDB from './imdb';
import AI from './ai';
import terminal from './terminal';

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
        describe: 'How many parallel downloads are allowed. It\'s relevant for the case of the TV show.',
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
    imdb = new IMDB(),
    player = new Player(browser),
    ai = new AI();

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

function produceVideoFile({ src, dest, tags }) {
    let ready = net.download(src, dest);

    if (ready && tags) {
        spawn('python', [
            path.resolve(__dirname, 'py/metadata.py'),
            dest,
            JSON.stringify(tags)
        ]);
    }
}

!async function() {
    let settings = await player.getPlayerSettings(url);

    if (!settings) return interrupt();

    const translation = await ai.translation(settings.translations),
        target = settings.formatUrl(translation),
        manifest = await player.getManifest(target);

    settings = await player.extractVideoInfo(target);

    if (settings.type === 'movie') {
        let params = await ai.video(manifest, 'movie'),
            info = await imdb.collectInfo(params.query);

        produceVideoFile({
            src: manifest[params.quality],
            dest: path.resolve(process.cwd(), params.dir, `${info.name}.mp4`),
            tags: info
        });
    }

    if (settings.type === 'tvshow') {
        let params = await ai.video(manifest, 'tvshow'),
            info = await imdb.collectInfo(params.query),
            download = await ai.tvshow(),
            seasons = settings.seasons,
            req = [];

        if (download === 'last') seasons = seasons.slice(-1);

        if (download === 'seasons') seasons = await ai.seasons(seasons);

        const episodesInfo = await Promise.all(seasons.map(season => {
            let target = settings.formatUrl(translation, { season });

            return player.extractVideoInfo(target);
        }));

        episodesInfo.forEach((data, i) => {
            req = req.concat(data.episodes.map(episode => ({
                season: seasons[i],
                episode
            })));
        });

        if (download === 'last') req = req.slice(-1);

        if (download === 'custom') {
            let selected = await ai.episodes(req);

            req = selected.map(i => req[i]);
        }

        terminal.info('Extracting...', '');

        for (let i = 0; i < req.length; i++) {
            let { season, episode } = req[i],
                url = settings.formatUrl(translation, { season, episode });

            url = (await player.getManifest(url) || {})[params.quality]; // eslint-disable-line no-await-in-loop

            i === 0 && terminal.clearLine();

            produceVideoFile({
                src: url,
                dest: formatEpisodePath(params.dir, info.name, season, episode),
                tags: {
                    ...info,
                    ...info.episodes[season][episode],
                    show: info.name,
                    season,
                    episode
                }
            });
        }
    }

    browser.close();
}();
