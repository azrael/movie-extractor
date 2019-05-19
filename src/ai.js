import os from 'os';
import { prompt } from 'enquirer';

const currentDir = process.cwd();

const questions = {
    series: () => ({
        type: 'select',
        name: 'download',
        message: 'Whoa, this is a TV series. Which action would you like to proceed next?',
        choices: [
            // { value: 3, name: 'Full', message: '• Download all the seasons!' },
            { value: 2, name: 'Season', message: '• Download current season' },
            { value: 1, name: 'Episode', message: '• Download only this episode' },
            { value: 0, name: 'Skip', message: '• Nah, just gimme the video source url' }
        ],
        result(name) { return this.find(name, 'value'); }
    }),
    download: () => ({
        type: 'toggle',
        name: 'download',
        message: 'Would you like to download the movie?',
        enabled: 'Yep',
        disabled: 'No',
        initial: true
    }),
    quality: (choices = []) => ({
        type: 'select',
        name: 'quality',
        message: 'Pick a quality',
        choices,
        result(name) { return this.find(name, 'value'); }
    }),
    title: (initial = '', isSeries = false) => ({
        type: 'input',
        name: 'title',
        message: `Enter the ${isSeries ? 'series' : 'movie'} title`,
        initial
    }),
    dir: (initial = currentDir) => ({
        type: 'input',
        name: 'dir',
        message: 'Enter the output directory',
        initial
    })
};

class AI {
    async ask({ type, manifest = {}, title } = {}) {
        let choices = Object.keys(manifest).map(value => ({ name: `${value}p`, value })),
            res = await prompt([
                type === 'serial' ? questions.series() : questions.download(),
                questions.quality(choices)
            ]);

        res.download = Number(res.download);

        if (res.download) {
            let additional = await prompt([
                questions.title(title, type === 'serial'),
                questions.dir()
            ]);

            additional.dir = additional.dir.replace(/^~/, os.homedir());

            res = { ...res, ...additional };
        }

        return res;
    }
}

const ai = new AI();

export default ai;
