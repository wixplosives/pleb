#!/usr/bin/env node

import path from 'path';
import program from 'commander';
import { printErrorAndExit } from './utils/process';
import { publish } from './commands/publish';
import { snapshot } from './commands/snapshot';
import { upgrade } from './commands/upgrade';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version, description } = require('../package.json');

process.on('unhandledRejection', printErrorAndExit);
process.on('uncaughtException', printErrorAndExit);

program
    .command('publish [target]')
    .description('publish unpublished packages')
    .option('--dry-run', 'no actual publishing (passed to npm as well)', false)
    .option('--contents <name>', 'subdirectory to publish (similar to lerna publish --contents)', '.')
    .option('--registry <url>', 'npm registry to use')
    .option('--tag <tag>', 'tag to use for published version', 'latest')
    .action(async (targetPath: string, { dryRun, contents, registry, tag }) => {
        try {
            await publish({
                directoryPath: path.resolve(targetPath || ''),
                dryRun,
                contents,
                registryUrl: registry,
                tag
            });
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .command('snapshot [target]')
    .description('publish a snapshot of the packages (based on git commit hash)')
    .option('--dry-run', 'no actual publishing (passed to npm as well)', false)
    .option('--contents <name>', 'subdirectory to publish (similar to lerna publish --contents)', '.')
    .option('--registry <url>', 'npm registry to use')
    .option('--tag <tag>', 'tag to use for published snapshot', 'next')
    .action(async (targetPath: string, { dryRun, contents, registry, tag }) => {
        try {
            await snapshot({
                directoryPath: path.resolve(targetPath || ''),
                dryRun,
                contents,
                registryUrl: registry,
                tag
            });
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .command('upgrade [target]')
    .description('upgrade dependencies and devDependencies of all packages')
    .option('--dry-run', 'no actual upgrading (just the fetching process)', false)
    .option('--registry <url>', 'npm registry to use')
    .action(async (targetPath: string, { dryRun, registry }) => {
        try {
            await upgrade({ directoryPath: path.resolve(targetPath || ''), dryRun, registryUrl: registry });
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .version(version, '-v, --version')
    .description(description)
    .usage('[options]')
    .parse(process.argv);
