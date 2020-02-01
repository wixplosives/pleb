import fs from 'fs';
import childProcess, { spawnSync } from 'child_process';
import pacote from 'pacote';
import { resolvePackages, INpmPackage } from './resolve-packages';
import { log, logWarn, logError } from './log';

const registry = `https://registry.npmjs.org/`;
const cmdPublishTextNext = `npm publish --tag next --registry ${registry}`;

export interface IPublishOptions {
    npmPackage: INpmPackage;
    /** @default false */
    dry?: boolean;
    /** @default 'latest' */
    tag?: string;
}

export async function publishPackage({ npmPackage, tag = 'latest', dry = false }: IPublishOptions): Promise<void> {
    const { directoryPath, packageJson } = npmPackage;
    const { name: packageName, version: packageVersion } = packageJson;
    if (packageJson.private) {
        logWarn(`${packageName}: private. skipping.`);
        return;
    }
    try {
        const versions = await fetchPackageVersions(packageName);
        if (!versions.includes(packageVersion)) {
            const npmArgs = ['publish', '--registry', registry];
            if (dry) {
                npmArgs.push('--dry-run');
            }
            if (tag !== 'latest') {
                npmArgs.push('--tag', tag);
            }
            log(`${packageName}: npm ${npmArgs.join(' ')}`);
            spawnSync('npm', npmArgs, {
                cwd: directoryPath,
                stdio: 'inherit',
                shell: true
            });
            log(`${packageName}: done.`);
        } else {
            logWarn(`${packageName}: ${packageVersion} is already published. skipping.`);
        }
    } catch (error) {
        logError(`${packageName}: error while publishing: ${error?.stack || error}.`);
    }
}

export async function publishSnapshot(contextPath: string, commitHash: string): Promise<void> {
    const packages = await resolvePackages(contextPath);
    const validPackages: INpmPackage[] = [];
    const packageToVersion = new Map<string, string>();
    for (const npmPackage of packages) {
        const { name: packageName, version: packageVersion, private: isPrivate } = npmPackage.packageJson;
        if (isPrivate) {
            logWarn(`${packageName}: private. skipping.`);
            continue;
        }
        validPackages.push(npmPackage);
        packageToVersion.set(packageName, `${packageVersion}-${commitHash.slice(0, 7)}`);
    }

    for (const { packageJson, packageJsonPath, directoryPath } of validPackages) {
        const { name: packageName, dependencies, devDependencies } = packageJson;
        packageJson.version = packageToVersion.get(packageName)!;
        if (dependencies) {
            overrideVersions(dependencies, packageToVersion);
        }

        if (devDependencies) {
            overrideVersions(devDependencies, packageToVersion);
        }

        log(`${packageName}: updating versions in package.json`);
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        log(`${packageName}: ${cmdPublishTextNext}`);
        childProcess.execSync(cmdPublishTextNext, { cwd: directoryPath, stdio: 'inherit' });
        log(`${packageName}: done`);
    }
}

function overrideVersions(dependencies: Record<string, string>, packageToVersion: Map<string, string>) {
    for (const depName of Object.keys(dependencies)) {
        const snapshotVersion = packageToVersion.get(depName);
        if (snapshotVersion !== undefined) {
            dependencies[depName] = snapshotVersion;
        }
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
