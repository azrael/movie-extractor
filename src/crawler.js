/* eslint-disable no-magic-numbers */

import url from 'url';
import terminal from './terminal';

const videoPlayerRegex = /streamguard|streamstorm|streamformular|moonwalk|mastarti|clastarti/,
    mp4ManifestRegex = /manifest\/mp4.json/;

const translationToken = '$TRANSLATION$';

const templates = {
    movie: `/video/${translationToken}/iframe`,
    serial: `/serial/${translationToken}/iframe`
};

async function extractTitle(page) {
    let title = await page.evaluate(() => {
        let $title = document.querySelector('meta[property="og:title"]');

        return $title ? $title.getAttribute('content') : '';
    });

    !title && (title = await page.title());

    return title || 'Unknown';
}

function createUrlFormatter(config) {
    let { type, ref, host: hostname, proto: protocol } = config;

    protocol = protocol.replace('://', '');

    return (translation, query = {}) => url.format({
        hostname,
        protocol,
        pathname: templates[type].replace(translationToken, translation),
        query: { ...query, ref }
    });
}

class Crawler {
    constructor(browser) {
        this.browser = browser;
    }

    async getPlayerSettings(pageUrl) {
        let page = await this.browser.newPage(),
            frame, settings;

        await page.goto(pageUrl);

        frame = page.frames().find(frame => videoPlayerRegex.test(frame.url()));

        if (!frame) return terminal.error('Sorry, I can\'t find any video player on the page');

        terminal.success('Ok, I\'ve detected a video player on the page');
        settings = await this.extractVideoInfo(frame);

        return {
            ...settings,
            title: await extractTitle(page)
        };
    }

    async getManifest(url) {
        let page = await this.browser.newPage(),
            manifest;

        manifest = new Promise(resolve => {
            page.on('response', async response => {
                const url = response.url();

                if (mp4ManifestRegex.test(url)) {
                    resolve(await response.json());
                }
            });
        });

        await page.goto(url);
        await page.click('#play_button');
        await page.waitFor(1000);

        return manifest;
    }

    async extractVideoInfo(target) {
        let page = target,
            info, config;

        if (typeof target === 'string') {
            page = await this.browser.newPage();
            await page.goto(target);
        }

        config = await page.evaluate(() => Promise.resolve(window.video_balancer_options));
        config.type = (config.content_type || 'movie').toLowerCase();

        info = {
            type: config.type,
            token: config.type === 'serial' ? config.serial_token : config.video_token,
            seasons: config.seasons,
            episodes: config.episodes,
            translations: config.type === 'serial' ? config.translations : config.movie_translations,
            formatUrl: createUrlFormatter(config)
        };

        return info;
    }
}

export default Crawler;
