#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-misused-promises */
import fs from 'fs';
import path from 'path';
import program from 'commander';
import { publishPackage, overridePackageJsons } from './commands/publish';
import { resolvePackages } from './utils/packages';
import { loadNpmConfig, uriToIdentifier, officialNpmRegistry } from './utils/npm';
import { currentGitCommitHash } from './utils/git';
import { printErrorAndExit } from './utils/process';

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
            const npmConfig = loadNpmConfig();
            const registryKey = uriToIdentifier(officialNpmRegistry);
            const token = npmConfig[`${registryKey}:_authToken`];
            for (const npmPackage of packages) {
                await publishPackage({ npmPackage, dryRun, distDir: contents, registry: officialNpmRegistry, token });
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
            const packages = await resolvePackages(directoryPath);

            const commitHash = currentGitCommitHash();
            if (!commitHash) {
                throw new Error(`cannot determine git commit hash for ${directoryPath}`);
            }
            const npmConfig = loadNpmConfig();
            const registryKey = uriToIdentifier(officialNpmRegistry);
            const token = npmConfig[`${registryKey}:_authToken`];
            const filesToRestore = await overridePackageJsons(packages, commitHash);
            try {
                for (const npmPackage of packages) {
                    await publishPackage({
                        tag: 'next',
                        npmPackage,
                        dryRun,
                        distDir: contents,
                        registry: officialNpmRegistry,
                        token
                    });
                }
            } finally {
                for (const [filePath, fileContents] of filesToRestore) {
                    await fs.promises.writeFile(filePath, fileContents);
                }
                filesToRestore.clear();
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
