import * as semver from 'semver'
const childProcess = require( 'child_process')
const getPackages = require( 'get-monorepo-packages' )
const pacote = require('pacote')
const chalk = require('chalk')

async function runPublishCommand(pathToFolder: string) {
    const cmdText = 'yarn publish --ignore-scripts --non-interactive --verbose --no-git-tag-version'
    let retVal = false
    try {
        childProcess.execSync(cmdText , {cwd: pathToFolder})
        retVal = true
    } catch (error) {
        console.log(chalk.red('\tyarn publish failed'))
    }
    return retVal
}

async function publishIfRequired(pathToFolder: string, pkgJsonContent: {name: string, version: string}) {
    let result = true
    const pjson = pkgJsonContent
    const opts = {
        '//registry.npmjs.org/:token': process.env.NPM_TOKEN
    }
    let manifest = {version : '0.0.0'}
    try {
        manifest = await pacote.manifest(pkgJsonContent.name, opts)
    } catch (error) {
        console.log('\tpacote cannot get version from npmjs', pkgJsonContent.name, error)
    }

    const globalVer = manifest.version
    const pkjJsonVer = pjson.version

    if ( pkjJsonVer !== undefined &&
        globalVer !== undefined &&
        semver.gt(pkjJsonVer, globalVer)) {
        console.log(chalk.green('\tPublish:', pkgJsonContent.name, pkjJsonVer, '=>', globalVer))
        result = await runPublishCommand(pathToFolder)
    } else {
        console.log(chalk.grey('\tNothing to publish:', pkgJsonContent.name, pkjJsonVer, globalVer))
    }

    return result
}

export async function CheckAndPublishMonorepo(pathToProject: string)  {
    const packages = await getPackages(pathToProject)
    let retVal = false
    for (const entry of packages) {
        console.log('Checking package: ' + entry.location)
        if ( await publishIfRequired(entry.location, entry.package) ){
            retVal = true
        }
    }
    return retVal
}
