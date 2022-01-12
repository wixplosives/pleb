/* eslint-disable no-console */
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { satisfies, lte } from 'semver';
import { resolveDirectoryContext, childPackagesFromContext } from '@wixc3/resolve-directory-context';
import { updateLockFile } from './npm.js';
import { gitTag, gitTagCommand, getGitStatus, gitCommit, gitPush } from './git.js';

const log = console.log.bind(console, '[Release]');

export function upgrade(projectPath: string, packageMap: Record<string, string>, dryRun: boolean) {
  if (Object.keys(packageMap).length === 0) {
    throw new Error('No packages to release');
  }
  log('Checking git status');
  if (!getGitStatus(projectPath).includes('nothing to commit')) {
    throw new Error('git status is not clean');
  }
  log('Git status is clean');

  const directoryContext = resolveDirectoryContext(projectPath);
  const packages = childPackagesFromContext(directoryContext);
  const updateStatus = {
    errors: [] as string[],
  };
  log('Upgrading packages');
  for (const [packageName, version] of Object.entries(packageMap)) {
    let found = false;

    for (const { packageJson, displayName } of packages) {
      if (displayName === packageName) {
        const currentVersion = packageJson.version || '0.0.0';
        if (lte(version, currentVersion)) {
          updateStatus.errors.push(`${packageName}@${currentVersion} is already at ${version} or higher`);
        }
        log(`Upgrading ${packageName} ${currentVersion} -> ${version}`);
        packageJson.version = version;
        found = true;
      }
      if (packageJson.dependencies) {
        const dependencies = packageJson.dependencies;
        const dependency = dependencies[packageName];
        if (dependency) {
          dependencies[packageName] = getModifier(dependency) + version;
        }
      }
      if (packageJson.devDependencies) {
        const devDependencies = packageJson.devDependencies;
        const dependency = devDependencies[packageName];
        if (dependency) {
          devDependencies[packageName] = getModifier(dependency) + version;
        }
      }
      if (packageJson.optionalDependencies) {
        const optionalDependencies = packageJson.optionalDependencies;
        const dependency = optionalDependencies[packageName];
        if (dependency) {
          optionalDependencies[packageName] = getModifier(dependency) + version;
        }
      }
      if (packageJson.peerDependencies) {
        const peerDependencies = packageJson.peerDependencies;
        if (peerDependencies[packageName]) {
          if (!satisfies(version, peerDependencies[packageName]!)) {
            updateStatus.errors.push(
              `Version ${version} for ${packageName} doesn't satisfy peerDependency of ${displayName}`
            );
          }
        }
      }
    }

    if (!found) {
      updateStatus.errors.push(`Package ${packageName} not found`);
    }
  }

  if (updateStatus.errors.length) {
    throw new Error(updateStatus.errors.join('\n'));
  }
  log('Done.');

  log('Writing package.json');
  if (!dryRun) {
    for (const { packageJson, packageJsonPath } of packages) {
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }
  }
  log('Done.');

  log('Updating npm lock file');
  manualPatchWorkspacePackages(projectPath, packageMap, dryRun);
  if (!dryRun) {
    if (!updateLockFile(projectPath)) {
      throw new Error('Failed to update npm lock file');
    }
  }
  log('Done.');
  if (!dryRun) {
    createGitTags(packageMap, projectPath, dryRun);
  }
  log('Done.');

  log('Committing changes');
  if (!dryRun) {
    gitCommit(projectPath, 'Release');
  }
  log('Done.');

  log('Pushing changes');
  if (!dryRun) {
    gitPush(projectPath);
  }
  log('Done.');
}

function createGitTags(packageMap: Record<string, string>, projectPath: string, dryRun: boolean) {
  const versionToPackageMap = versionToPackage(packageMap);
  if (versionToPackageMap.size === 1) {
    // unified version
    log('Creating git tag');
    for (const [version] of versionToPackageMap) {
      log(dryRun ? gitTagCommand(version) : gitTag(projectPath, version));
    }
  } else {
    // non-unified version
    log(`Creating git tags for ${versionToPackageMap.size} versions`);
    // create tag for each package in the same version
    for (const [version, packages] of versionToPackageMap) {
      for (const packageName of packages) {
        log(dryRun ? gitTagCommand(version, packageName) : gitTag(projectPath, version, packageName));
      }
    }
  }
}

function versionToPackage(packageMap: Record<string, string>) {
  const groupedPackageMap = new Map<string, string[]>();
  for (const [packageName, version] of Object.entries(packageMap)) {
    const group = groupedPackageMap.get(version);
    if (group) {
      group.push(packageName);
    } else {
      groupedPackageMap.set(version, [packageName]);
    }
  }
  return groupedPackageMap;
}

function manualPatchWorkspacePackages(projectPath: string, packageMap: Record<string, string>, dryRun: boolean) {
  const lockFilePath = join(projectPath, 'package-lock.json');
  const packageLock = JSON.parse(readFileSync(lockFilePath, 'utf-8')) as {
    packages: Record<string, { version: string; name: string }>;
    lockfileVersion: number;
  };

  if (packageLock.lockfileVersion !== 2) {
    throw new Error('package-lock.json version is not 2');
  }
  let count = 0;
  for (const packageEntry of Object.values(packageLock.packages)) {
    if (packageMap[packageEntry.name]) {
      count++;
      packageEntry.version = packageMap[packageEntry.name]!;
    }
  }
  log(`Manual updating ${count} workspace packages`);
  if (!dryRun) {
    writeFileSync(lockFilePath, JSON.stringify(packageLock, null, 2) + '\n');
  }
}

function getModifier(dependency: string) {
  return dependency.startsWith('^') ? '^' : dependency.startsWith('~') ? '~' : '';
}
