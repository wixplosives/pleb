import path from 'path';
import { promises as fsPromises } from 'fs';
import type { PackageJson } from 'type-fest';
import { fileExists } from '../utils/fs';
import { childPackagesFromContext, resolveDirectoryContext } from '../utils/directory-context';
import { log } from '../utils/log';
import { isString, mapRecord } from '../utils/language-helpers';
import { INpmPackage, PACKAGE_JSON } from '../utils/npm-package';

export interface LinkOptions {
  directoryPath: string;
  clean?: boolean;
}

export async function link({ directoryPath }: LinkOptions): Promise<void> {
  const workspaces: string[] = [];
  const devDependencies: Record<string, string> = {};

  const localPackageVersions = new Map<string, string | undefined>();
  const lockFiles: string[] = [];
  const localPackages: INpmPackage[] = [];
  for (const item of await fsPromises.readdir(directoryPath, { withFileTypes: true })) {
    const childPath = path.join(directoryPath, item.name);
    const packageJsonPath = path.join(childPath, 'package.json');
    if (!item.isDirectory() || !(await fileExists(packageJsonPath))) {
      continue;
    }
    log(packageJsonPath);
    const directoryContext = await resolveDirectoryContext(packageJsonPath);
    localPackages.push(...childPackagesFromContext(directoryContext));
    const yarnLockPath = path.join(childPath, 'yarn.lock');
    if (await fileExists(yarnLockPath)) {
      lockFiles.push(await fsPromises.readFile(yarnLockPath, 'utf-8'));
    }
    if (directoryContext.type === 'multi') {
      workspaces.push(...directoryContext.packageLocations.map((location) => path.posix.join(item.name, location)));
      const { packageJson: rootPackageJson } = directoryContext.rootPackage;
      if (rootPackageJson.devDependencies) {
        for (const [packageName, semverRequest] of Object.entries(rootPackageJson.devDependencies)) {
          if (!localPackageVersions.has(packageName)) {
            devDependencies[packageName] = semverRequest;
          }
        }
      }
      for (const { packageJson } of directoryContext.packages) {
        if (isString(packageJson.name)) {
          localPackageVersions.set(packageJson.name, packageJson.version);
        }
      }
    } else {
      const { packageJson } = directoryContext.npmPackage;
      if (isString(packageJson.name)) {
        localPackageVersions.set(packageJson.name, packageJson.version);
      }
      workspaces.push(item.name);
    }
  }
  const rootPackageJson: PackageJson = {
    name: path.basename(directoryPath),
    private: true,
    workspaces,
    devDependencies,
  };
  const rootPackageJsonPath = path.join(directoryPath, PACKAGE_JSON);
  await fsPromises.writeFile(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
  if (lockFiles.length) {
    const rootLockFilePath = path.join(directoryPath, 'yarn.lock');
    await fsPromises.writeFile(rootLockFilePath, lockFiles.join('\n'));
  }
  const getVersionRequest = (packageName: string, currentRequest: string): string => {
    const localPackageVersion = localPackageVersions.get(packageName);
    return isString(localPackageVersion) ? `^${localPackageVersion}` : currentRequest;
  };

  for (const { packageJsonPath, packageJson } of localPackages) {
    const newPackageJson: PackageJson = { ...packageJson };
    if (packageJson.dependencies) {
      newPackageJson.dependencies = mapRecord(packageJson.dependencies, getVersionRequest);
    }
    if (packageJson.devDependencies) {
      newPackageJson.devDependencies = mapRecord(packageJson.devDependencies, getVersionRequest);
    }
    await fsPromises.writeFile(packageJsonPath, JSON.stringify(newPackageJson, null, 2) + '\n');
  }
  log(`Done.`);
}
