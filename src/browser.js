import puppeteer from 'puppeteer';
import terminal from './terminal';
import { videoPlayerRegex, mp4ManifestRegex, pageLoadTimeout } from './config';
// import { ai } from './ai';

async function extractTitle(page) {
    let title = await page.evaluate(() => document.querySelector('meta[property="og:title"]').getAttribute('content'));

    !title && (title = await page.title());

    return title || 'Unknown';
}

// export async function parsePage(url, { headless } = {}) {
//     let browser = await puppeteer.launch({ headless }),
//         page = await browser.newPage(),
//         frame,
//         result = {};
//
//     function exit(msg) {
//         msg && terminal.error(msg);
//         browser.close();
//     }
//
//     page.on('response', async response => {
//         const url = response.url();
//
//         if (!result.manifest && mp4ManifestRegex.test(url)) {
//             result.manifest = await response.json();
//         }
//     });
//
//     await page.goto(url);
//     terminal.success(`Page ${url} is loaded`);
//
//     frame = page.frames().find(frame => videoPlayerRegex.test(frame.url()));
//
//     if (frame) {
//         terminal.success('Ok, I\'ve detected a video player on the page');
//         result.config = await frame.evaluate(() => Promise.resolve(window.video_balancer_options));
//         await frame.click('#play_button');
//         await page.waitFor(pageLoadTimeout);
//     } else
//         return exit('Sorry, I can\'t find any video player on the page');
//
//     if (result.manifest) {
//         terminal.success('Got it! I\'ve found the video sources');
//     } else
//         return exit('Oh crap... There are no video sources');
//
//     result.title = await extractTitle(page);
//
//     browser.close();
//
//     return result;
// }

class Browser {
    constructor(options = {}) {
        this.options = options;
    }

    async check() {
        if (!this.instance) this.instance = await puppeteer.launch(this.options);
    }

    close() {
        this.instance.close();
    }

    terminate(msg) {
        msg && terminal.error(msg);
        this.close();
    }

    async parseSettings(url) {
        await this.check();

        let page = await this.instance.newPage(),
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
            return this.terminate('Sorry, I can\'t find any video player on the page');

        settings.manifest = await this.getManifest(settings.url);

        return settings;
    }

    async getManifest(url) {
        await this.check();

        let page = await this.instance.newPage(),
            manifest;

        page.on('response', async response => {
            const url = response.url();

            if (!manifest && mp4ManifestRegex.test(url)) {
                manifest = await response.json();
            }
        });

        await page.goto(url);
        await page.click('#play_button');
        await page.waitFor(pageLoadTimeout);

        return manifest;
    }
}

export default Browser;
