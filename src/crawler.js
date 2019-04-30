/* eslint-disable no-magic-numbers */

import Browser from './browser';
import terminal from './terminal';

const browser = new Browser();

const videoPlayerRegex = /streamguard|streamstorm|streamformular|moonwalk/,
    mp4ManifestRegex = /manifest\/mp4.json/;

async function extractTitle(page) {
    let title = await page.evaluate(() => document.querySelector('meta[property="og:title"]').getAttribute('content'));

    !title && (title = await page.title());

    return title || 'Unknown';
}

class Crawler {
    async getPlayerSettings(url) {
        let page = await browser.newPage(),
            frame,
            settings = {};

        await page.goto(url);

        frame = page.frames().find(frame => videoPlayerRegex.test(frame.url()));

        if (frame) {
            terminal.success('Ok, I\'ve detected a video player on the page');

            let config = await frame.evaluate(() => Promise.resolve(window.video_balancer_options));

            settings = {
                type: (config.content_type || '').toLowerCase(),
                seasons: config.seasons,
                episodes: config.episodes,
                season: config.season,
                episode: config.episode,
                url: frame.url(),
                title: await extractTitle(page)
            };
        } else
            return browser.terminate('Sorry, I can\'t find any video player on the page');

        settings.manifest = await this.getManifest(settings.url);

        return settings;
    }

    async getManifest(url) {
        let page = await browser.newPage(),
            manifest;

        page.on('response', async response => {
            const url = response.url();

            if (!manifest && mp4ManifestRegex.test(url)) {
                manifest = await response.json();
            }
        });

        await page.goto(url);
        await page.click('#play_button');
        await page.waitFor(1000);

        return manifest;
    }
}

export default Crawler;
