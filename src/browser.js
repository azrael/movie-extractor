/* eslint-disable no-magic-numbers */

import puppeteer from 'puppeteer';

let browser;

class Browser {
    constructor(options = {}) {
        this.options = options;
        browser = this;
    }

    async check() {
        if (!this.instance) this.instance = await puppeteer.launch(this.options);
    }

    close() {
        this.instance && this.instance.close();
    }

    async newPage() {
        await this.check();

        return this.instance.newPage();
    }
}

export default Browser;
