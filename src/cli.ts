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

const pathToProject = path.resolve(args[0])
console.log('lerna-publisher starting in ' + pathToProject)
const result = CheckAndPublishMonorepo(pathToProject).catch(printErrorAndExit)
if (result) {
    console.log('Success')
} else {
    console.log('Failed')
}

function printErrorAndExit(message: unknown) {
    console.error(message)
    process.exit(1)
}
