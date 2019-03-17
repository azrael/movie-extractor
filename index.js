// import args from 'args';
// import { argv } from 'yargs';
//
// args
//     .option('url', 'The URL of the web page to parse')
//     .option('help', 'Output usage information')
//     .option('version', 'Output the version number');
//
// args.parse(process.argv, {
//     help: false,
//     version: false
// });
//
// if (!argv.url) args.showHelp();

import { argv } from 'yargs';
import { parsePage } from './src/browser';
import { exit } from './src/controller';

if (!argv.url) exit();

!async function() {
    let { manifest } = await parsePage(argv.url);

    // console.log(manifest);

    return manifest;
}();
