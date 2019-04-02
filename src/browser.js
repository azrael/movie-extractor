import puppeteer from 'puppeteer';
import { log } from './terminal';

const videoPlayerRegex = /streamguard|streamstorm|streamformular|moonwalk/,
    mp4ManifestRegex = /manifest\/mp4.json/,
    pageLoadTimeout = 1000;

async function extractTitle(page) {
    let title = await page.evaluate(() => document.querySelector('meta[property="og:title"]').getAttribute('content'));

    !title && (title = await page.title());

    return title || 'Unknown';
}

export async function parsePage(url, { headless } = {}) {
    let browser = await puppeteer.launch({ headless }),
        page = await browser.newPage(),
        frame,
        result = {};

    function exit(msg) {
        msg && log.error(msg);
        browser.close();
    }

    page.on('response', async response => {
        const url = response.url();

        if (!result.manifest && mp4ManifestRegex.test(url)) {
            result.manifest = await response.json();
        }
    });

    await page.goto(url);
    log.success(`Page ${url} is loaded`);

    frame = page.frames().find(frame => videoPlayerRegex.test(frame.url()));

    if (frame) {
        log.success('Ok, I\'ve detected a video player on the page');
        await frame.click('#play_button');
        await page.waitFor(pageLoadTimeout);
    } else
        return exit('Sorry, I can\'t find any video player on the page');

    if (result.manifest) {
        log.success('Got it! I\'ve found the video sources');
    } else
        return exit('Oh crap... There are no video sources');

    result.title = await extractTitle(page);

    browser.close();

    return result;
}
