import fs from 'fs';
import type childProcess from 'child_process';
import { retry } from 'promise-assist';
import type { PackageJson } from 'type-fest';
import type { NpmRegistry } from './npm-registry';
import type { INpmPackage } from './npm-package';
import { spawnSyncLogged } from './process';
import { isString, isPlainObject } from './language-helpers';
import { logWarn, log } from './log';

export async function getPackagesToPublish(packages: INpmPackage[], registry: NpmRegistry): Promise<INpmPackage[]> {
  const packagesToPublish: INpmPackage[] = [];
  for (const npmPackage of packages) {
    const { displayName, packageJson } = npmPackage;
    const { name: packageName, version: packageVersion } = packageJson;
    if (typeof packageName !== 'string') {
      logWarn(`${displayName}: no package name. skipping.`);
      continue;
    }
    if (packageJson.private) {
      logWarn(`${packageName}: private. skipping.`);
      continue;
    }
    if (typeof packageVersion !== 'string') {
      logWarn(`${packageName}: invalid version field. skipping.`);
      continue;
    }
    log(`${packageName}: fetching versions...`);
    const versions = await retry(() => registry.fetchVersions(packageName), {
      delay: 1000,
      retries: 3,
    });

    log(`${packageName}: got ${versions.length} published versions.`);
    if (!versions.length) {
      logWarn(`${packageName}: package was never published.`);
      packagesToPublish.push(npmPackage);
    } else if (!versions.includes(packageVersion)) {
      logWarn(`${packageName}: ${packageVersion} was never published.`);
      packagesToPublish.push(npmPackage);
    } else {
      logWarn(`${packageName}: ${packageVersion} is already published. skipping.`);
    }
  }
  return packagesToPublish;
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
  if (!isPlainObject(packageJson)) {
    throw new Error(`${packageJsonPath} is not a valid json object.`);
  }
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
