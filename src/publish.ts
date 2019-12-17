import childProcess from 'child_process';
import chalk from 'chalk';
const getPackages = require('get-monorepo-packages');
const pacote = require('pacote');
const cmdPublishText = 'npm publish --registry https://registry.npmjs.org/';
const cmdPublishTextNext = 'npm publish --tag next --registry https://registry.npmjs.org/';
const pacoteOptions = {
    '//registry.npmjs.org/:token': process.env.NPM_TOKEN
};

export async function publish(directoryPath: string): Promise<void> {
    const packages = await getPackages(directoryPath);
    for (const entry of packages) {
        if (entry.package.private) {
            console.log(chalk.yellow(`package ${entry.package.name} is private. skipping.`));
            continue;
        }
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

async function patchPkgJsonVersion(packLocation: string, version: string, customText: string): Promise<void> {
    console.log(chalk.green('<<<<<<<<<<<<<<<<<<<<< Patching version for package: ', packLocation));
    const additionalTag = customText.substring(0, 8);
    const cmdVersionText = `npm version ${version}-${additionalTag}`;
    childProcess.execSync(cmdVersionText, { cwd: packLocation, stdio: 'inherit' });
}

export async function publishSnpashot(directoryPath: string, shortSha: string): Promise<void> {
    const packages = await getPackages(directoryPath);
    for (const entry of packages) {
        if (entry.package.private) {
            console.log(chalk.yellow(`package ${entry.package.name} is private. skipping.`));
            continue;
        }
        await patchPkgJsonVersion(entry.location, entry.package.version, shortSha);
        console.log(chalk.green('<<<<<<<<<<<<<<<<<<<<< Publishing snapshot for package: ', entry.location));
        childProcess.execSync(cmdPublishTextNext, { cwd: entry.location, stdio: 'inherit' });
        console.log(chalk.green('>>>>>>>>>>>>>>>>>>>>> Done: ', entry.location));
    }
}
