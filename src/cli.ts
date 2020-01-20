#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-misused-promises */
import path from 'path';
import program from 'commander';
import { publish, publishSnapshot } from './publish';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version, description } = require('../package.json');

const { NPM_TOKEN } = process.env;
process.on('unhandledRejection', printErrorAndExit);

program
    .command('publish [folder]')
    .description('publish all unpublish packages')
    .action(async (folder: string) => {
        if (!NPM_TOKEN) {
            console.log('process.env.NPM_TOKEN is empty or not defined. Not publishing.');
            return;
        }
        try {
            const directoryPath = path.resolve(folder || '');
            console.log('lerna-publisher starting in ' + directoryPath);
            await publish(directoryPath);
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .command('publishSnapshot [folder]')
    .description('publish all unpublished packages')
    .action((folder: string) => {
        if (!NPM_TOKEN) {
            console.log('process.env.NPM_TOKEN is empty or not defined. Not publishing.');
            return;
        }
        try {
            const directoryPath = path.resolve(folder || '');
            console.log('lerna-publisher starting in ' + directoryPath);
            const commitHash = String(process.env.GITHUB_SHA);
            publishSnapshot(directoryPath, commitHash);
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .version(version, '-v, --version')
    .description(description)
    .usage('[options]')
    .parse(process.argv);

function printErrorAndExit(message: unknown) {
    console.error(message);
    process.exit(1);
}
