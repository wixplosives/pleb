import path from 'path';
import fs from 'fs';
import type { PackageJson } from 'type-fest';
import { resolveDirectoryContext, getRootPackage } from '@wixc3/resolve-directory-context';
import { spawnSyncLogged } from '../utils/process.js';

export interface VersionOptions {
  directoryPath: string;
  dryRun?: boolean;
  target?: string;
}

export async function version({ directoryPath, target = 'patch' }: VersionOptions): Promise<void> {
  const directoryContext = resolveDirectoryContext(directoryPath, { ...fs, ...path });
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

    const localVersionMapper = (packageName: string, currentValue: string): string =>
      localPackageNames.has(packageName) ? `^${newRootVersion!}` : currentValue;

    for (const childPackage of directoryContext.packages) {
      const { packageJson } = childPackage;
      const { dependencies, devDependencies, peerDependencies } = packageJson;
      if (dependencies) {
        packageJson.dependencies = mapRecord(dependencies, localVersionMapper);
      }
      if (devDependencies) {
        packageJson.devDependencies = mapRecord(devDependencies, localVersionMapper);
      }
      if (peerDependencies) {
        packageJson.peerDependencies = mapRecord(peerDependencies, localVersionMapper);
      }
    }

    for (const childPackage of directoryContext.packages) {
      const newPackageJsonContent = JSON.stringify(childPackage.packageJson, null, 2) + '\n';
      await fs.promises.writeFile(childPackage.packageJsonPath, newPackageJsonContent);
    }
  }
}

function mapRecord<T extends Partial<Record<string, string>>>(
  record: T,
  mapper: (key: string, value: string) => string
): T {
  const mappedRecord: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    mappedRecord[key] = mapper(key, value!);
  }
  return mappedRecord as T;
}
