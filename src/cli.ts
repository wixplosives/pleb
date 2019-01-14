#!/usr/bin/env node
import program from 'commander'
import path from 'path'

import { CheckAndPublishMonorepo } from './publish_lerna'
import { uploadFolder } from './aws'
import { postLinkToPRTest } from './github'

const getPackages = require( 'get-monorepo-packages' )
const { version, description } = require('../package.json')

process.on('unhandledRejection', printErrorAndExit)

program
    .command('publish [folder]') // sub-command name
    .description('publish all unpublish pacakges') // command description
    // function to execute when command is uses
    .action( (folder: string) => {
        runPublishCommand(folder)
    })

program
    .command('deploydemo [pkgName]') // sub-command name
    .description('Deploy package for demo usage') // command description
    // function to execute when command is uses
    .action( (pkgName: string) => {
        runDeployCommand(pkgName)
    })

program
    .version(version, '-v, --version')
    .description(description)
    .usage('[options]')
    .option('--no-colors', 'turn off colors (default: env detected)')
    .parse(process.argv)

// const {
//     args
// } = program

async function getWorkingFolder( pathToFolder: string) {
    let pathToProject = process.cwd()

    if ( pathToFolder !== '' && pathToFolder !== undefined) {
        pathToProject = path.resolve(pathToFolder)
    }
    return pathToProject
}

async function runDeployCommand(pkgPath: string) {
    console.log('runDeployCommand' , pkgPath)
    let prNum = 0
    const varValue = process.env.TRAVIS_PULL_REQUEST
    let result = true
    if ( varValue === 'false' || varValue === undefined ) {
        console.log('Not a pull request.Nothing to deploy.')
        process.exit( 0 )
    } else {
        prNum = parseInt(varValue, 10)
    }

    const bucketName = process.env.AWS_BUCKET || ''
    const branchName = process.env.TRAVIS_BRANCH || ''
    const githubToken = process.env.GITHUB_TOKEN || ''
    const githubSlug = process.env.TRAVIS_REPO_SLUG || ''
    const pathToPkg = path.resolve(pkgPath)
    const packages = getPackages(pathToPkg)
    const slugParts = githubSlug.split('/')
    const repo = slugParts[1]
    const org = slugParts[0]

    for (const entry of packages) {
        console.log('Deploy package: ' + entry.location)
        const pathToPublish = path.join(entry.location, 'dist')
        result = await uploadFolder(pathToPublish, entry.name, branchName)
        if ( result ) {
            const cureentToime = new Date()
            const textToPublish = 'Demo server. Deployed at ' + cureentToime.toString()
            const linkToPublish = path.join('http://', bucketName,
                                           entry.name, branchName )
            result = await postLinkToPRTest(textToPublish, linkToPublish,
                                            githubToken, org, repo,
                                            prNum)
        }
        if ( result === false ) {
            break
        }
    }
    process.exit( result ? 0 : 1 )
}

async function runPublishCommand(folder: string) {
    const pathToProject = await getWorkingFolder(folder)
    console.log('lerna-publisher starting in ' + pathToProject)

    const result = await CheckAndPublishMonorepo(pathToProject).catch(printErrorAndExit)
    if ( result) {
        console.log('Success')
    } else {
        console.log('Failed')
    }
    process.exit( result ? 0 : 1 )
}

function printErrorAndExit(message: unknown) {
    console.error(message)
    process.exit(1)
}
