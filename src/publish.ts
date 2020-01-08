import childProcess from 'child_process';
import { green, yellow, red } from 'chalk';
import pacote from 'pacote';
import { resolvePackages } from './resolve-packages';

const registry = `https://registry.npmjs.org/`;
const cmdPublishText = `npm publish --registry ${registry}`;
const cmdPublishTextNext = `npm publish --tag next --registry ${registry}`;

const log = (message: string) => console.log(green('# ') + message);
const logWarn = (message: string) => console.log(yellow('# ') + message);
const logError = (message: string) => console.log(red('# ') + message);

export async function publish(contextPath: string): Promise<void> {
    const packages = await resolvePackages(contextPath);
    for (const { directoryPath, packageJson, packageJsonPath } of packages) {
        const { name: packageName, version: packageVersion } = packageJson;
        if (packageName === undefined) {
            logWarn(`${packageJsonPath}: no "name" field. skipping.`);
            continue;
        } else if (packageJson.private) {
            logWarn(`${packageName}: private. skipping.`);
            continue;
        } else if (packageVersion === undefined) {
            logWarn(`${packageName}: no "version" field. skipping.`);
            continue;
        }
        await publishIfRequired(packageName, packageVersion, directoryPath);
        log(`${packageName}: done.`);
    }
}

async function publishIfRequired(packageName: string, packageVersion: string, packagePath: string) {
    try {
        const versions = await fetchPackageVersions(packageName);
        if (!versions.includes(packageVersion)) {
            childProcess.execSync(cmdPublishText, { cwd: packagePath, stdio: 'inherit' });
        } else {
            logWarn(`${packageName}: ${packageVersion} is already published. skipping.`);
        }
    } catch (error) {
        logError(`${packageName}: error while publishing: ${error?.message || error}.`);
    }
}

export async function publishSnapshot(contextPath: string, commitHash: string): Promise<void> {
    commitHash = commitHash.slice(0, 7);
    const packages = await resolvePackages(contextPath);
    for (const { directoryPath, packageJson, packageJsonPath } of packages) {
        const { name: packageName, version: packageVersion } = packageJson;
        if (packageName === undefined) {
            logWarn(`${packageJsonPath}: no "name" field. skipping.`);
            continue;
        } else if (packageJson.private) {
            logWarn(`${packageName}: private. skipping.`);
            continue;
        } else if (packageVersion === undefined) {
            logWarn(`${packageName}: no "version" field. skipping.`);
            continue;
        }
        const cmdVersionText = `npm version ${packageVersion}-${commitHash}`;
        log(`${packageName}: ${cmdVersionText}`);
        childProcess.execSync(cmdVersionText, { cwd: directoryPath, stdio: 'inherit' });
        log(`${packageName}: ${cmdPublishTextNext}`);
        childProcess.execSync(cmdPublishTextNext, { cwd: directoryPath, stdio: 'inherit' });
        log(`${packageName}: done`);
    }
}

async function fetchPackageVersions(packageName: string): Promise<string[]> {
    try {
        log(`${packageName}: fetching versions...`);
        const packument = await pacote.packument(packageName, {
            '//registry.npmjs.org/:token': process.env.NPM_TOKEN
        });
        const versions = Object.keys(packument.versions);
        log(`${packageName}: published versions - ${versions.join(', ')}`);
        return versions;
    } catch (error) {
        if (error?.statusCode === 404) {
            logWarn(`${packageName}: package was never published.`);
            return [];
        } else {
            throw error;
        }
    }
}
