#!/usr/bin/env node
import program from 'commander'
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

console.log('Do publish on:' + pathToFolder)
CheckAndPublishMonorepo(args[0]).catch(printErrorAndExit)

function printErrorAndExit(message: unknown) {
    console.error(message)
    process.exit(1)
}
