
const childProcess = require( 'child_process')
const getPackages = require( 'get-monorepo-packages' )
const pacote = require('pacote')
const chalk = require('chalk')

async function runPublishCommand(pathToFolder: string) {
    console.log('Run yarn publish command at ', pathToFolder)
    const cmdPublishText = 'yarn publish --non-interactive --no-git-tag-version --registry https://registry.npmjs.org/'
    let retVal = false
    try {
        childProcess.execSync(cmdPublishText , {cwd: pathToFolder, stdio: 'inherit'})
        retVal = true
    } catch (error) {
        console.log(chalk.red('\tyarn publish failed'), pathToFolder )
    }
    return retVal
}

async function publishIfRequired(pathToFolder: string, pkgJsonContent: {name: string, version: string}) {
    let result = true
    const opts = {
        '//registry.npmjs.org/:token': process.env.NPM_TOKEN
    }
    const verArray = Array()
    try {
        const packument = await pacote.packument(pkgJsonContent.name, opts)
        console.log('\tpacote got versions for ',pkgJsonContent.name, Object.keys(packument.versions))
        Object.keys(packument.versions).forEach(key => {verArray.push(key)})
    } catch (error) {
        console.error(chalk.red('\tpacote cannot get packument from npmjs', pkgJsonContent.name))
    }

    if ( verArray.indexOf(pkgJsonContent.version) === -1 ) {
        result = await runPublishCommand(pathToFolder)
        const resultString = result ? chalk.green('SUCCESS') : chalk.red('FAILED')
        console.log(chalk.green( pkgJsonContent.name,  pkgJsonContent.version, '\tPublish '), resultString)
    } else {
        console.log(chalk.yellow( pkgJsonContent.name,
                                pkgJsonContent.version,
                                '\tNothing to publish (version is already published)'))
    }
    return result
}

export async function CheckAndPublishMonorepo(pathToProject: string)  {
    const packages = await getPackages(pathToProject)
    let retVal = false
    for (const entry of packages) {
        console.log(chalk.green('<<<<<<<<<<<<<<<<<<<<< Checking package: ', entry.location))
        if ( await publishIfRequired(entry.location, entry.package) ) {
            retVal = true
        }
        console.log(chalk.green('>>>>>>>>>>>>>>>>>>>>> Done: ', entry.location))
    }
    return retVal
}
