#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-misused-promises */
import path from 'path';
import program from 'commander';
import { publishPackage, publishSnapshot } from './publish';
import { log, logError } from './log';
import { resolvePackages } from './resolve-packages';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version, description } = require('../package.json');

const { NPM_TOKEN } = process.env;
process.on('unhandledRejection', printErrorAndExit);

program
    .command('publish [folder]')
    .description('publish all unpublish packages')
    .option('--dry', 'dry run (no actual publishing)', false)
    .option('--distDir <name>', 'subdirectory to publish', '.')
    .action(async (folder: string, { dry, distDir }) => {
        try {
            const directoryPath = path.resolve(folder || '');
            const packages = await resolvePackages(directoryPath);
            for (const npmPackage of packages) {
                await publishPackage({ npmPackage, dry, distDir });
            }
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .command('publishSnapshot [folder]')
    .description('publish all unpublished packages')
    .action(async (folder: string) => {
        if (!NPM_TOKEN) {
            logError('process.env.NPM_TOKEN is empty or not defined. Not publishing.');
            return;
        }
        try {
            const directoryPath = path.resolve(folder || '');
            log('lerna-publisher starting in ' + directoryPath);
            const commitHash = String(process.env.GITHUB_SHA);
            await publishSnapshot(directoryPath, commitHash);
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
    logError(message);
    process.exit(1);
}
