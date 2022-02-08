import fs from 'fs';
import type { PackageJson } from 'type-fest';
import { resolveDirectoryContext, getRootPackage } from '@wixc3/resolve-directory-context';
import { spawnSyncLogged } from '../utils/process.js';
import { mapRecord } from '../utils/language-helpers.js';

export interface VersionOptions {
  directoryPath: string;
  dryRun?: boolean;
  target?: string;
}

export async function version({ directoryPath, target = 'patch' }: VersionOptions): Promise<void> {
  const directoryContext = resolveDirectoryContext(directoryPath);
  const rootPackage = getRootPackage(directoryContext);
  spawnSyncLogged(
    'npm',
    ['version', target, '--no-git-tag-version'],
    {
      shell: true,
      cwd: rootPackage.directoryPath,
      stdio: 'inherit',
    },
    rootPackage.displayName
  );
  const newRootContent = await fs.promises.readFile(rootPackage.packageJsonPath, 'utf8');
  const { version: newRootVersion } = JSON.parse(newRootContent) as PackageJson;
  if (directoryContext.type === 'multi') {
    const localPackageNames = new Set<string>();
    for (const childPackage of directoryContext.packages) {
      const { packageJson } = childPackage;
      if (packageJson.version) {
        packageJson.version = newRootVersion;
        if (packageJson.name) {
          localPackageNames.add(packageJson.name);
        }
      }
    }
    for (const childPackage of directoryContext.packages) {
      const { packageJson } = childPackage;
      const { dependencies, devDependencies, peerDependencies } = packageJson;
      if (dependencies) {
        packageJson.dependencies = mapRecord(dependencies, (packageName, currentValue) =>
          localPackageNames.has(packageName) ? `^${newRootVersion!}` : currentValue
        );
      }
      if (devDependencies) {
        packageJson.devDependencies = mapRecord(devDependencies, (packageName, currentValue) =>
          localPackageNames.has(packageName) ? `^${newRootVersion!}` : currentValue
        );
      }
      if (peerDependencies) {
        packageJson.peerDependencies = mapRecord(peerDependencies, (packageName, currentValue) =>
          localPackageNames.has(packageName) ? `^${newRootVersion!}` : currentValue
        );
      }
    }
    for (const childPackage of directoryContext.packages) {
      const newPackageJsonContent = JSON.stringify(childPackage.packageJson, null, 2) + '\n';
      await fs.promises.writeFile(childPackage.packageJsonPath, newPackageJsonContent);
    }
  }
}
