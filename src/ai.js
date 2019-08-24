import os from 'os';
import { prompt } from 'enquirer';

const currentDir = process.cwd();

class AI {
    async translation(translations = []) {
        let choices = translations.map(([value, name]) => ({ name, value })),
            { value } = await prompt({
                type: 'select',
                name: 'value',
                message: 'There are different translations. Choose one',
                choices,
                result(name) { return this.find(name, 'value'); }
            });

        return value;
    }

    video(manifest, title, type) {
        let choices = Object.keys(manifest).map(value => ({ name: `${value}p`, value }));

        return prompt([
            {
                type: 'select',
                name: 'quality',
                message: 'Pick a quality',
                choices,
                result(name) { return this.find(name, 'value'); }
            },
            {
                type: 'input',
                name: 'title',
                message: `Enter the ${type === 'serial' ? 'series' : 'movie'} title`,
                initial: title
            },
            {
                type: 'input',
                name: 'dir',
                message: 'Enter the output directory',
                initial: currentDir,
                result(dir) { return dir.replace(/^~/, os.homedir()); }
            }
        ]);
    }

    async series() {
        let { value } = await prompt({
            type: 'select',
            name: 'value',
            message: 'This is a TV series. Choose the option',
            choices: [
                { value: 'show', name: 'Full show', message: '• Download the whole show' },
                { value: 'last', name: 'Last episode', message: '• Download the last episode' },
                { value: 'seasons', name: 'Seasons', message: '• Choose seasons' },
                { value: 'custom', name: 'Custom', message: '• Custom episode selection' }
            ],
            result(name) { return this.find(name, 'value'); }
        });

        return value;
    }

    async seasons(seasons) {
        let { value } = await prompt({
            type: 'multiselect',
            name: 'value',
            message: 'Pick seasons',
            choices: seasons.map(i => ({ name: `Season ${i}`, value: i })),
            result(options) { return options.map(name => this.find(name, 'value')); }
        });

        return value;
    }

    async episodes(options) {
        let choices = options.map(({ season, episode }, i) => ({
            name: `s${season}e${episode}`,
            message: `Season ${season} Episode ${episode}`,
            value: i
        }));

        const { value } = await prompt({
            type: 'multiselect',
            name: 'value',
            message: 'Ok, now pick some episodes',
            choices,
            result(options) { return options.map(name => this.find(name, 'value')); }
        });

        return value;
    }
}

const ai = new AI();

export default ai;
