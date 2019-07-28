import childProcess from 'child_process';
import chalk from 'chalk';
const getPackages = require('get-monorepo-packages');
const pacote = require('pacote');

const cmdPublishText = 'npm publish --registry https://registry.npmjs.org/';
const pacoteOptions = {
    '//registry.npmjs.org/:token': process.env.NPM_TOKEN
};

export async function publish(directoryPath: string): Promise<void> {
    const packages = await getPackages(directoryPath);
    for (const entry of packages) {
        console.log(chalk.green('<<<<<<<<<<<<<<<<<<<<< Checking package: ', entry.location));
        await publishIfRequired(entry.location, entry.package);
        console.log(chalk.green('>>>>>>>>>>>>>>>>>>>>> Done: ', entry.location));
    }
}

async function publishIfRequired(directoryPath: string, pkgJsonContent: { name: string; version: string }) {
    const publishedVersions: string[] = [];

    try {
        const packument = await pacote.packument(pkgJsonContent.name, pacoteOptions);
        const versions = Object.keys(packument.versions);
        console.log('\tpacote got versions for ', pkgJsonContent.name, versions);
        for (const version of versions) {
            publishedVersions.push(version);
        }
    } catch (error) {
        console.error(chalk.red('\tpacote cannot get packument from npmjs', pkgJsonContent.name));
    }

    if (!publishedVersions.includes(pkgJsonContent.version)) {
        childProcess.execSync(cmdPublishText, { cwd: directoryPath, stdio: 'inherit' });
    } else {
        console.log(
            chalk.yellow(
                pkgJsonContent.name,
                pkgJsonContent.version,
                '\tNothing to publish (version is already published)'
            )
        );
    }
}
