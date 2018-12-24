#!/usr/bin/env node
import program from 'commander'
import path from 'path'

import { CheckAndPublishMonorepo } from './publish_lerna'

const { version, description } = require('../package.json')

process.on('unhandledRejection', printErrorAndExit)

program
    .version(version, '-v, --version')
    .description(description)
    .usage('[options]')
    .option('--no-colors', 'turn off colors (default: env detected)')
    .parse(process.argv)

const {
    args
} = program

async function getWorkingFolder( cmdargs: string[]) {
    let pathToProject = process.cwd()

    if (arguments.length !== 0 && cmdargs[0] !== '') {
        pathToProject = path.resolve(cmdargs[0])
    }
    return pathToProject
}

async function runTheCommand() {
    const pathToProject = await getWorkingFolder(args)
    console.log('lerna-publisher starting in ' + pathToProject)

    const result = await CheckAndPublishMonorepo(pathToProject).catch(printErrorAndExit)
    if ( result) {
        console.log('Success')
    } else {
        console.log('Failed')
    }
    process.exit( result ? 0 : 1 )
}

runTheCommand()

function printErrorAndExit(message: unknown) {
    console.error(message)
    process.exit(1)
}
