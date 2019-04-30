/* eslint-disable no-magic-numbers */

import puppeteer from 'puppeteer';
import terminal from './terminal';

let browser;

class Browser {
    constructor(options = {}) {
        // Browser is a singleton
        if (browser) return browser;

        this.options = options;
        browser = this;
    }

    async check() {
        if (!this.instance) this.instance = await puppeteer.launch(this.options);
    }

    close() {
        this.instance && this.instance.close();
    }

    terminate(msg) {
        msg && terminal.error(msg);
        this.close();
    }

    async newPage() {
        await this.check();

        return this.instance.newPage();
    }
}

export default Browser;
