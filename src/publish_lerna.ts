
const childProcess = require( 'child_process')
const getPackages = require( 'get-monorepo-packages' )
const pacote = require('pacote')
const chalk = require('chalk')

async function runPublishCommand(pathToFolder: string) {
    const cmdSetRegistry = 'npm config set registry https://registry.npmjs.org/'
    const cmdText = 'yarn publish --ignore-scripts --non-interactive --verbose --no-git-tag-version'
    let retVal = false
    try {
        childProcess.execSync(cmdSetRegistry , {cwd: pathToFolder})
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
    const verArray = Array()
    try {
        const packument = await pacote.packument(pkgJsonContent.name, opts)
        Object.keys(packument.versions).forEach(key => {verArray.push(key)})
    } catch (error) {
        console.log('\tpacote cannot get packument from npmjs', pkgJsonContent.name, error)
    }
    const pkjJsonVer = pjson.version
    if ( verArray.indexOf(pkjJsonVer) === -1 ) {
        result = await runPublishCommand(pathToFolder)
    } else {
        console.log(chalk.grey('\tNothing to publish:', pkgJsonContent.name, pkjJsonVer))
    }
    return result
}

export async function CheckAndPublishMonorepo(pathToProject: string)  {
    const packages = await getPackages(pathToProject)
    let retVal = false
    for (const entry of packages) {
        console.log('Checking package: ' + entry.location)
        if ( await publishIfRequired(entry.location, entry.package) ) {
            retVal = true
        }
    }
    return retVal
}
