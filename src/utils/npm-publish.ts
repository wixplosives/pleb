import fs from 'fs';
import path from 'path';
import type childProcess from 'child_process';
import type { PackageJson } from 'type-fest';
import { retry, IRetryOptions } from 'promise-assist';
import type { NpmRegistry } from './npm-registry';
import type { INpmPackage } from './npm-package';
import { log, logWarn } from './log';
import { spawnSyncLogged } from './process';
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
    retries: 3,
  },
}: IPublishNpmPackageOptions): Promise<void> {
  const { directoryPath, packageJson, packageJsonPath } = npmPackage;
  const { name: packageName, version: packageVersion } = packageJson;
  if (!packageName) {
    logWarn(`${packageJsonPath}: no package name. skipping.`);
    return;
  }
  if (packageJson.private) {
    logWarn(`${packageName}: private. skipping.`);
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
      const publishArgs = npmPublishArgs(registry, dryRun, tag);

      if (distDirectoryPath === directoryPath) {
        const spawnOptions: childProcess.SpawnSyncOptions = {
          cwd: directoryPath,
          stdio: 'inherit',
          shell: true,
        };
        spawnSyncLogged('npm', publishArgs, spawnOptions, packageName);
      } else {
        executePrepublishScripts(npmPackage);
        await removePrepublishScripts(path.join(distDirectoryPath, 'package.json'), filesToRestore);
        const distSpawnOptions: childProcess.SpawnSyncOptions = {
          cwd: distDirectoryPath,
          stdio: 'inherit',
          shell: true,
        };
        spawnSyncLogged('npm', publishArgs, distSpawnOptions, packageName);
      }
      log(`${packageName}: done.`);
    } else {
      logWarn(`${packageName}: ${packageVersion!} is already published. skipping.`);
    }
  } finally {
    for (const [filePath, fileContents] of filesToRestore) {
      await fs.promises.writeFile(filePath, fileContents);
    }
    filesToRestore.clear();
  }
}

export function npmPublishArgs(registry: NpmRegistry, dryRun: boolean, tag: string): string[] {
  const publishArgs: string[] = ['publish', '--registry', registry.url];
  if (dryRun) {
    publishArgs.push('--dry-run');
  }
  if (tag !== 'latest') {
    publishArgs.push('--tag', tag);
  }
  return publishArgs;
}

export function executePrepublishScripts({ displayName, directoryPath, packageJson }: INpmPackage): void {
  const spawnOptions: childProcess.SpawnSyncOptions = {
    cwd: directoryPath,
    stdio: 'inherit',
    shell: true,
  };
  const { scripts = {} } = packageJson;
  if (isString(scripts.prepare)) {
    spawnSyncLogged('npm', ['run', 'prepare'], spawnOptions, displayName);
  }
  if (isString(scripts.prepublishOnly)) {
    spawnSyncLogged('npm', ['run', 'prepublishOnly'], spawnOptions, displayName);
  }
  if (isString(scripts.prepack)) {
    spawnSyncLogged('npm', ['run', 'prepack'], spawnOptions, displayName);
  }
}

export async function removePrepublishScripts(
  packageJsonPath: string,
  filesToRestore: Map<string, string>
): Promise<void> {
  const packageJsonContents = await fs.promises.readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContents) as PackageJson;
  const { scripts } = packageJson;
  if (
    scripts &&
    (scripts.prepare !== undefined || scripts.prepublishOnly !== undefined || scripts.prepack !== undefined)
  ) {
    delete scripts.prepare;
    delete scripts.prepublishOnly;
    delete scripts.prepack;
    // retain original EOL. JSON.stringify always outputs \n.
    const newPackageJsonContent = JSON.stringify(packageJson, null, 2) + '\n';
    const normalizedNewPackageJsonContent = packageJsonContents.includes('\r\n')
      ? newPackageJsonContent.replace(/\n/g, '\r\n')
      : newPackageJsonContent;
    filesToRestore.set(packageJsonPath, packageJsonContents);
    await fs.promises.writeFile(packageJsonPath, normalizedNewPackageJsonContent);
  }
}
