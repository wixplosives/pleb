import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import { PackageJson } from 'type-fest';
import { retry, IRetryOptions } from 'promise-assist';
import { log, logWarn } from './log';
import { spawnSyncLogged } from './process';
import { NpmRegistry } from './npm-registry';
import { INpmPackage } from './npm-package';
import { isString } from './language-helpers';

export interface IPublishNpmPackageOptions {
    npmPackage: INpmPackage;
    registry: NpmRegistry;
    /** @default false */
    dryRun?: boolean;
    /** @default 'latest' */
    tag?: string;
    /** @default '.' */
    distDir?: string;
    /**
     * Retry options to use when fetching versions.
     * @default { delay: 1000, retries: 3 }
     */
    retryOptions?: IRetryOptions;
}

export async function npmPublish({
    npmPackage,
    tag = 'latest',
    dryRun = false,
    distDir = '.',
    registry,
    retryOptions = {
        delay: 1000,
        retries: 3
    }
}: IPublishNpmPackageOptions): Promise<void> {
    const { directoryPath, packageJson, packageJsonPath } = npmPackage;
    const { name: packageName, version: packageVersion, scripts = {} } = packageJson;
    if (packageJson.private) {
        logWarn(`${packageName ?? packageJsonPath}: private. skipping.`);
        return;
    }
    if (!packageName) {
        logWarn(`${packageJsonPath}: no package name. skipping.`);
        return;
    }
    const distDirectoryPath = path.join(directoryPath, distDir);
    const filesToRestore = new Map<string, string>();

    try {
        log(`${packageName}: fetching versions...`);
        const versions = await retry(() => registry.fetchVersions(packageName), retryOptions);
        log(`${packageName}: got ${versions.length} published versions.`);
        if (!versions.length) {
            logWarn(`${packageName}: package was never published.`);
        }

        if (!versions.includes(packageVersion!)) {
            const publishArgs = ['publish', '--registry', registry.url];
            if (dryRun) {
                publishArgs.push('--dry-run');
            }
            if (tag !== 'latest') {
                publishArgs.push('--tag', tag);
            }

            const rootSpawnOptions: childProcess.SpawnSyncOptions = {
                cwd: directoryPath,
                stdio: 'inherit',
                shell: true
            };

            if (distDirectoryPath === directoryPath) {
                spawnSyncLogged('npm', publishArgs, rootSpawnOptions, packageName);
            } else {
                if (isString(scripts.prepare)) {
                    spawnSyncLogged('npm', ['run', 'prepare'], rootSpawnOptions, packageName);
                }
                if (isString(scripts.prepublishOnly)) {
                    spawnSyncLogged('npm', ['run', 'prepublishOnly'], rootSpawnOptions, packageName);
                }
                if (isString(scripts.prepack)) {
                    spawnSyncLogged('npm', ['run', 'prepack'], rootSpawnOptions, packageName);
                }

                const distPackageJsonPath = path.join(distDirectoryPath, 'package.json');
                const distSpawnOptions: childProcess.SpawnSyncOptions = {
                    cwd: distDirectoryPath,
                    stdio: 'inherit',
                    shell: true
                };

                const distPackageJsonContents = await fs.promises.readFile(distPackageJsonPath, 'utf8');
                const distPackageJson = JSON.parse(distPackageJsonContents) as PackageJson;
                if (distPackageJson.scripts) {
                    delete distPackageJson.scripts.prepare;
                    delete distPackageJson.scripts.prepublishOnly;
                    delete distPackageJson.scripts.prepack;
                    filesToRestore.set(distPackageJsonPath, distPackageJsonContents);
                    await fs.promises.writeFile(distPackageJsonPath, JSON.stringify(distPackageJson, null, 2));
                }
                spawnSyncLogged('npm', publishArgs, distSpawnOptions, packageName);
            }
            log(`${packageName}: done.`);
        } else {
            logWarn(`${packageName}: ${packageVersion} is already published. skipping.`);
        }
    } finally {
        for (const [filePath, fileContents] of filesToRestore) {
            await fs.promises.writeFile(filePath, fileContents);
        }
        filesToRestore.clear();
    }
}
