import childProcess from 'child_process';
import chalk from 'chalk';
import pacote from 'pacote';
import { resolvePackages, INpmPackage } from './resolve-packages';
const cmdPublishText = 'npm publish --registry https://registry.npmjs.org/';
const cmdPublishTextNext = 'npm publish --tag next --registry https://registry.npmjs.org/';
const pacoteOptions = {
    '//registry.npmjs.org/:token': process.env.NPM_TOKEN
};

export async function publish(directoryPath: string): Promise<void> {
    const packages = await resolvePackages(directoryPath);
    for (const foundPackage of packages) {
        if (foundPackage.packageJson.private) {
            console.log(
                chalk.yellow(
                    `package ${foundPackage.packageJson.name || foundPackage.packageJsonPath} is private. skipping.`
                )
            );
            continue;
        }
        console.log(chalk.green('<<<<<<<<<<<<<<<<<<<<< Checking package: ', directoryPath));
        await publishIfRequired(foundPackage);
        console.log(chalk.green('>>>>>>>>>>>>>>>>>>>>> Done: ', foundPackage.directoryPath));
    }
}

async function publishIfRequired({ directoryPath, packageJson: packageJson }: INpmPackage) {
    const publishedVersions: string[] = [];
    if (packageJson.name === undefined || packageJson.version === undefined) {
        return;
    }
    try {
        const packument = await pacote.packument(packageJson.name, pacoteOptions);
        const versions = Object.keys(packument.versions);
        console.log('\tpacote got versions for ', packageJson.name, versions);
        for (const version of versions) {
            publishedVersions.push(version);
        }
    } catch (error) {
        console.error(chalk.red('\tpacote cannot get packument from npmjs', packageJson.name));
    }

    if (!publishedVersions.includes(packageJson.version)) {
        childProcess.execSync(cmdPublishText, { cwd: directoryPath, stdio: 'inherit' });
    } else {
        console.log(
            chalk.yellow(packageJson.name, packageJson.version, '\tNothing to publish (version is already published)')
        );
    }
}

async function patchPkgJsonVersion(packLocation: string, version: string, customText: string): Promise<void> {
    console.log(chalk.green('<<<<<<<<<<<<<<<<<<<<< Patching version for package: ', packLocation));
    const additionalTag = customText.substring(0, 7);
    const cmdVersionText = `npm version ${version}-${additionalTag}`;
    childProcess.execSync(cmdVersionText, { cwd: packLocation, stdio: 'inherit' });
}

export async function publishSnapshot(directoryPath: string, shortSha: string): Promise<void> {
    const packages = await resolvePackages(directoryPath);
    for (const foundPackage of packages) {
        const packageName = foundPackage.packageJson.name || foundPackage.packageJsonPath;
        if (foundPackage.packageJson.private) {
            console.log(chalk.yellow(`package ${packageName} is private. skipping.`));
            continue;
        } else if (foundPackage.packageJson.version === undefined) {
            console.log(chalk.yellow(`package ${packageName} is private. skipping.`));
            continue;
        }
        await patchPkgJsonVersion(foundPackage.directoryPath, foundPackage.packageJson.version, shortSha);
        console.log(chalk.green('<<<<<<<<<<<<<<<<<<<<< Publishing snapshot for package: ', foundPackage.directoryPath));
        childProcess.execSync(cmdPublishTextNext, { cwd: foundPackage.directoryPath, stdio: 'inherit' });
        console.log(chalk.green('>>>>>>>>>>>>>>>>>>>>> Done: ', foundPackage.directoryPath));
    }
}
