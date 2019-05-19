/* eslint-disable no-magic-numbers */

import qs from 'qs';
import fetch from 'node-fetch';

class OMDB {
    constructor(browser) {
        this.browser = browser;
        this.series = {};
    }

    setup(apiKey) {
        this.apiKey = apiKey;
    }

    async register() {
        const mailer = await this.browser.newPage(),
            omdb = await this.browser.newPage(),
            self = this;

        const res = new Promise(resolve => {
            let timer = setTimeout(resolve, 10000);

            async function tick(response) {
                if (/refresh/.test(response.url())) {
                    let mails = await response.json() || [],
                        mail = mails.find(({ od }) => /omdbapi/.test(od));

                    if (mail) {
                        clearTimeout(timer);
                        mailer.off('response', tick);
                        await mailer.goto(`https://www.minuteinbox.com/email/id/${mail.id}`);
                        let html = (await mailer.content()).replace(/\n/g, ''),
                            [, apiKey, activationUrl] = /Here is your key: (\w+).+?activate your key: (http.+?)</.exec(html);

                        activationUrl && await omdb.goto(activationUrl);

                        self.setup(apiKey);
                        resolve(apiKey);
                    }
                }
            }

            mailer.on('response', tick);
        });

        await mailer.goto('https://www.minuteinbox.com/');

        let email = await mailer.evaluate(() => {
            window.tma.resetLoop();
            setInterval(() => window.tma.nactiPostu(), 1000);

            return Promise.resolve(document.getElementById('email').innerText);
        });

        email && await omdb.goto(`http://www.omdbapi.com/apikey.aspx?__EVENTTARGET=&__EVENTARGUMENT=&__LASTFOCUS=&__VIEWSTATE=%2FwEPDwUKLTIwNDY4MTIzNQ9kFgQCAQ9kFgYCAQ8QDxYCHgdDaGVja2VkaGRkZGQCAw8QDxYCHwBnZGRkZAIFDxYCHgdWaXNpYmxlaGQCAw8WAh8BaGQYAQUeX19Db250cm9sc1JlcXVpcmVQb3N0QmFja0tleV9fFgMFC3BhdHJlb25BY2N0BQtwYXRyZW9uQWNjdAUIZnJlZUFjY3TvWlO7Jtj7qiTKs52%2BVMNSm0AbwXdUEUzdGC8dUMLmEQ%3D%3D&__VIEWSTATEGENERATOR=5E550F58&__EVENTVALIDATION=%2FwEdAAh%2BTBQhjB3%2BmvsqY8zTgGWbmSzhXfnlWWVdWIamVouVTzfZJuQDpLVS6HZFWq5fYphdL1XrNEjnC%2FKjNya%2Bmqh8hRPnM5dWgso2y7bj7kVNLSFbtYIt24Lw6ktxrd5Z67%2F4LFSTzFfbXTFN5VgQX9Nbzfg78Z8BXhXifTCAVkevdx5dizNOL2XrCx6JMLGH3nzolsY8ZpgqV68%2BSe1gwotn&at=freeAcct&Email2=${email}&FirstName=Jon&LastName=Snow&TextArea1=test&Button1=Submit`);

        return res;
    }

    async search(title, options = {}) {
        if (!this.apiKey) return;

        const query = {
            t: title,
            ...options,
            apikey: this.apiKey,
            r: 'json',
            type: 'episode' in options ? 'episode' : 'movie'
        };

        let res = await fetch(`http://www.omdbapi.com/?${qs.stringify(query)}`);

        res = await res.json();

        if (res.Response !== 'True') return null;

        res = {
            name: res.Title,
            plot: res.Plot.slice(0, 255),
            date: `${new Date(Date.parse(`${res.Released} GMT`)).toISOString().split('.')[0]}Z`,
            genre: res.Genre.split(', '),
            cover: res.Poster
        };

        if (query.type === 'episode') {
            if (!this.series[title]) {
                delete query.season;
                delete query.episode;
                query.type = 'series';

                this.series[title] = await fetch(`http://www.omdbapi.com/?${qs.stringify(query)}`).then(res => res.json());
            }

            res = {
                ...res,
                show: this.series[title].Title,
                season: options.season,
                episode: options.episode,
                cover: this.series[title].Poster
            };
        }

        return res;
    }
}

export default OMDB;
