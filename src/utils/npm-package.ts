import path from 'path';
import fs from 'fs';
import type { PackageJson } from 'type-fest';
import { flattenTree, isString, concatIterables, isPlainObject } from './language-helpers';

export const PACKAGE_JSON = 'package.json';

export interface INpmPackage {
  displayName: string;
  directoryPath: string;
  packageJsonPath: string;
  packageJsonContent: string;
  packageJson: PackageJson;
}

export async function resolveLinkedPackages(rootPackage: INpmPackage): Promise<INpmPackage[]> {
  const { dependencies = {}, devDependencies = {} } = rootPackage.packageJson;
  const linkedPackages: INpmPackage[] = [];
  for (const request of concatIterables(Object.values(dependencies), Object.values(devDependencies))) {
    if (request.startsWith('file:')) {
      const linkTarget = request.slice(5);
      const directoryPath = path.join(rootPackage.directoryPath, linkTarget);
      const packageJsonPath = path.join(directoryPath, PACKAGE_JSON);
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;

      if (!isPlainObject(packageJson)) {
        throw new Error(`${packageJsonPath} is not a valid json object.`);
      }

      const displayName = packageJson.name ? packageJson.name : packageJsonPath;

      linkedPackages.push({
        displayName,
        directoryPath,
        packageJson,
        packageJsonPath,
        packageJsonContent,
      });
    }
  }
  return linkedPackages;
}

export function getDirectDepPackages(npmPackage: INpmPackage, packages: Map<string, INpmPackage>): Set<INpmPackage> {
  const depPackages = new Set<INpmPackage>();
  for (const depName of getPackageDependencyNames(npmPackage.packageJson)) {
    const depPackage = packages.get(depName);
    if (depPackage && depPackage !== npmPackage) {
      depPackages.add(depPackage);
    }
  }
  return depPackages;
}

function getPackageDependencyNames({ dependencies = {}, devDependencies = {}, peerDependencies = {} }: PackageJson) {
  return new Set([...Object.keys(dependencies), ...Object.keys(devDependencies), ...Object.keys(peerDependencies)]);
}

export function sortPackagesByDepth(packages: INpmPackage[]): INpmPackage[] {
  const namedPackages = new Map();
  for (const npmPackage of packages) {
    const { name: packageName } = npmPackage.packageJson;
    if (isString(packageName)) {
      namedPackages.set(packageName, npmPackage);
    }
  }

  const packageToDeepDeps = new Map<INpmPackage, Set<INpmPackage>>(
    packages.map((npmPackage) => [
      npmPackage,
      flattenTree(npmPackage, (p) => Array.from(getDirectDepPackages(p, namedPackages))),
    ])
  );

  const sortedPackages: INpmPackage[] = [];

  for (const npmPackage of packages) {
    const dependingPackageIdx = sortedPackages.findIndex((sortedPackage) =>
      packageToDeepDeps.get(sortedPackage)!.has(npmPackage)
    );
    if (dependingPackageIdx === -1) {
      sortedPackages.push(npmPackage);
    } else {
      sortedPackages.splice(dependingPackageIdx, 0, npmPackage);
    }
  }

  return sortedPackages;
}
