#!/usr/bin/env node
import path from 'path';
import program from 'commander';
import { publish, publishSnapshot } from './publish';
import { deploy } from './deploy';
const { version, description } = require('../package.json');

const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ID,
    AWS_BUCKET_NAME,
    GITHUB_TOKEN,
    TRAVIS_PULL_REQUEST,
    TRAVIS_REPO_SLUG,
    NPM_TOKEN
} = process.env;
process.on('unhandledRejection', printErrorAndExit);

program
    .command('publish [folder]') // sub-command name
    .description('publish all unpublish pacakges') // command description
    // function to execute when command is uses
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
    .command('publishSnapshot [folder]') // sub-command name
    .description('publish all unpublish pacakges') // command description
    // function to execute when command is uses
    .action(async (folder: string) => {
        if (!NPM_TOKEN) {
            console.log('process.env.NPM_TOKEN is empty or not defined. Not publishing.');
            return;
        }
        try {
            const directoryPath = path.resolve(folder || '');
            console.log('lerna-publisher starting in ' + directoryPath);
            const shortSha = String(process.env.GITHUB_SHA);
            await publishSnapshot(directoryPath, shortSha);
        } catch (e) {
            printErrorAndExit(e);
        }
    });

program
    .command('deploydemo [pkgName] [folder]') // sub-command name
    .description('Deploy package for demo usage') // command description
    // function to execute when command is uses
    // .option('--aws-bucket-name <string>', 'aws bucket name to publish to.')
    .action(async (pkgName: string, folder: string) => {
        if (TRAVIS_PULL_REQUEST === 'false' || TRAVIS_PULL_REQUEST === undefined) {
            console.log('Not a PR. Not deploying.');
            return;
        }
        try {
            if (!AWS_ACCESS_KEY_ID) {
                throw new Error('process.env.AWS_ACCESS_KEY_ID is empty or not defined. Not deploying.');
            } else if (!AWS_SECRET_ID) {
                throw new Error('process.env.AWS_SECRET_ID is empty or not defined. Not deploying.');
            } else if (!AWS_BUCKET_NAME) {
                throw new Error('process.env.AWS_BUCKET_NAME is empty or not defined. Not deploying.');
            } else if (!GITHUB_TOKEN) {
                throw new Error('process.env.GITHUB_TOKEN is empty or not defined. Not deploying.');
            } else if (!TRAVIS_PULL_REQUEST) {
                throw new Error('process.env.TRAVIS_PULL_REQUEST is empty or not defined. Not deploying.');
            } else if (!TRAVIS_REPO_SLUG) {
                throw new Error('process.env.TRAVIS_REPO_SLUG is empty or not defined. Not deploying.');
            }

            const prNum = parseInt(TRAVIS_PULL_REQUEST, 10) || 0;
            const directoryPath = path.resolve(folder || '');
            console.log(`Deploying demo for ${pkgName} at ${directoryPath}`);
            await deploy(directoryPath, pkgName, prNum);
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
