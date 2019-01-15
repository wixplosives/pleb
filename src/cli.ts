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
    .command('deploydemo [pkgName] [folder]') // sub-command name
    .description('Deploy package for demo usage') // command description
    // function to execute when command is uses
    .action( ( pkgName: string, folder: string) => {
        console.log( pkgName, folder )
        runDeployCommand(folder, pkgName)
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

export async function getRepoAndOrg( githubLink: string ) {
    // git@github.com:wixplosives/lerna-publisher.git
    let parts = githubLink.split(':')
    parts = parts[1].split('.')
    parts = parts[0].split('/')
    return parts
}

export async function runDeployCommand(folder: string, pkgname: string) {
    console.log('Deploy ' , pkgname , 'from' , folder)
    let prNum = 0
    const varValue = process.env.TRAVIS_PULL_REQUEST
    let result = true
    if ( varValue === 'false' || varValue === undefined ) {
        console.log('Not a pull request.Nothing to deploy.')
        process.exit( 0 )
    } else {
        prNum = parseInt(varValue, 10)
    }
    const pathToProject = await getWorkingFolder(folder)
    const packages = getPackages(pathToProject)

    const pkgToDeploy = packages.find((element: { package: { name: string, version: string }, location: string}) => {
            return element.package.name === pkgname
      })

    // const bucketName = process.env.AWS_BUCKET_NAME || ''
    const bucketLink = process.env.AWS_BUCKET_LINK || ''
    const branchName = process.env.TRAVIS_BRANCH || ''
    const githubToken = process.env.GITHUB_TOKEN || ''
    const githubSlug = process.env.TRAVIS_REPO_SLUG || ''
    const slugParts = githubSlug.split('/')
    const repo = slugParts[1]
    const org = slugParts[0]

    console.log('Deploy package from folder: ' + pkgToDeploy.location )
    const pathToPublish = path.join(pkgToDeploy.location, 'dist')
    result = await uploadFolder(pathToPublish, pkgToDeploy.package.name, branchName)
    console.debug('Upload folder to s3 result: ', result ? 'SUCCESS' : 'FAIL')
    if ( result ) {
        const cureentToime = new Date()
        const textToPublish = 'Demo server. Deployed at ' + cureentToime.toString()

        const linkToPublish = 'http://' + path.join( bucketLink,
                                        pkgToDeploy.package.name, branchName )
        console.debug('Link to publish',linkToPublish)
        result = await postLinkToPRTest(textToPublish, linkToPublish,
                                        githubToken, org, repo,
                                        prNum)
        console.debug('Post link to PR result: ', result ? 'SUCCESS' : 'FAIL')
    }
    console.log('Exiting', result ? 0 : 1)
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
