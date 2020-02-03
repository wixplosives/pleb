#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-misused-promises */
import fs from 'fs';
import path from 'path';
import program from 'commander';
import { publishPackage, overridePackageJsons } from './publish';
import { logError } from './log';
import { resolvePackages } from './resolve-packages';
import { spawnSync } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version, description } = require('../package.json');

process.on('unhandledRejection', printErrorAndExit);

program
    .command('publish [folder]')
    .description('publish all unpublish packages')
    .option('--dry-run', 'no actual publishing (passed to npm as well)', false)
    .option('--contents <name>', 'subdirectory to publish (similar to lerna publish --contents)', '.')
    .action(async (folder: string, { dryRun, contents }) => {
        try {
            const directoryPath = path.resolve(folder || '');
            const packages = await resolvePackages(directoryPath);
            for (const npmPackage of packages) {
                await publishPackage({ npmPackage, dryRun, distDir: contents });
            }
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .command('publishSnapshot [folder]')
    .description('publish all unpublished packages')
    .option('--dry-run', 'no actual publishing (passed to npm as well)', false)
    .option('--contents <name>', 'subdirectory to publish (similar to lerna publish --contents)', '.')
    .action(async (folder: string, { dryRun, contents }) => {
        try {
            const directoryPath = path.resolve(folder || '');
            const commitHash = currentGitCommitHash();
            const packages = await resolvePackages(directoryPath);
            if (commitHash) {
                const filesToRestore = await overridePackageJsons(packages, commitHash);
                try {
                    for (const npmPackage of packages) {
                        await publishPackage({ npmPackage, dryRun, distDir: contents, tag: 'next' });
                    }
                } finally {
                    for (const [filePath, fileContents] of filesToRestore) {
                        await fs.promises.writeFile(filePath, fileContents);
                    }
                    filesToRestore.clear();
                }
            } else {
                throw new Error(`cannot determine git commit hash for ${directoryPath}`);
            }
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .version(version, '-v, --version')
    .description(description)
    .usage('[options]')
    .parse(process.argv);

function currentGitCommitHash() {
    const { stdout, status } = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
    return status === 0 ? stdout.trim() : undefined;
}

function printErrorAndExit(message: unknown) {
    logError(message);
    process.exit(1);
}
