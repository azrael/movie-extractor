import fetch from 'node-fetch';
import Crawler from 'crawler';

const options = {
    maxConnections: 10,
    rotateUA: true,
    userAgent: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
        'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
        'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
        'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.71 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
        'Mozilla/5.0 (Windows NT 5.1; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
        'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0',
        'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1',
        'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:18.0) Gecko/20100101 Firefox/18.0',
        'Mozilla/5.0 (Windows NT 5.1; rv:36.0) Gecko/20100101 Firefox/36.0',
        'Mozilla/5.0 (Windows NT 5.1; rv:33.0) Gecko/20100101 Firefox/33.0',
        'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:50.0) Gecko/20100101 Firefox/50.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0',
        'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:52.0) Gecko/20100101 Firefox/52.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_6; en-en) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1'
    ]
};

let i = Math.floor(Math.random() * options.userAgent.length);

options.userAgent = [
    ...options.userAgent.slice(i),
    ...options.userAgent.slice(0, i)
];

function formatDate(date) {
    return `${date.toISOString().split('.')[0]}Z`;
}

async function search(query) {
    let res = await fetch(`https://v2.sg.media-imdb.com/suggests/${query[0]}/${query}.json`);

    res = await res.text();
    res = /\((.*)\)/.exec(res)[1];
    res = JSON.parse(res);
    res = res.d[0];

    return {
        id: res.id,
        name: res.l,
        cover: res.i[0]
    };
}

function getBasicInfo($) {
    const props = {
        plot: $('.plot_summary .summary_text').text().trim(),
        genre: []
    };

    $('.title_wrapper .subtext a[href*=genre]').each((i, node) => {
        props.genre.push($(node).text().trim());
    });

    $('.title_wrapper .subtext a[title*=release\\ dates]').each((i, node) => {
        let date = new Date(Date.parse(`${$(node).text().trim()} Z`));

        if (Number.isInteger(date.getTime()))
            props.date = formatDate(date);
    });

    return props;
}

function getEpisodesInfo(id, season) {
    return new Promise((resolve, reject) => {
        const page = new Crawler({
            ...options,
            callback(error, res, done) {
                if (error) return [reject(error), done()];

                const $ = res.$;

                const data = $('.eplist .list_item .info').map((i, node) => {
                    node = $(node);

                    const props = {
                        name: node.find('> strong').text().trim(),
                        plot: node.find('> .item_description').text().trim()
                    };

                    const date = new Date(Date.parse(`${node.find('> .airdate').text().trim()} Z`));

                    if (Number.isInteger(date.getTime()))
                        props.date = formatDate(date);

                    return props;
                });

                resolve([season, data.get()]);
                done();
            }
        });

        page.queue(`https://www.imdb.com/title/${id}/episodes?season=${season}`);
    });
}

function fillData({ id, ...fields }) {
    return new Promise((resolve, reject) => {
        const page = new Crawler({
            ...options,
            async callback(error, res, done) {
                if (error) return [reject(error), done()];

                const $ = res.$;

                const props = {
                    ...fields,
                    ...getBasicInfo($)
                };

                try {
                    let seasons = $(`a[href^=\\/title\\/${id}\\/episodes\\?season]`)
                        .map((i, node) => getEpisodesInfo(id, $(node).text().trim()));

                    props.episodes = await Promise.all(seasons.get());
                } catch (err) {
                    return reject(err);
                }

                props.episodes = props.episodes.reduce((memo, [season, episodes]) => ({
                    ...memo,
                    [season]: episodes.reduce((memo, data, i) => ({
                        ...memo,
                        [i + 1]: data
                    }), {})
                }), {});

                resolve(props);
                done();
            }
        });

        page.queue(`https://www.imdb.com/title/${id}`);
    });
}

export default class IMDB {
    async collectInfo(query) {
        let res = await search(query);

        res = await fillData(res);

        return res;
    }
}
