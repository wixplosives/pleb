import { PackageJson } from 'type-fest';
import { flattenTree, isString } from './language-helpers';

export const PACKAGE_JSON = 'package.json';

export interface INpmPackage {
    directoryPath: string;
    packageJsonPath: string;
    packageJsonContent: string;
    packageJson: PackageJson;
}

export function getDirectDepPackages(npmPackage: INpmPackage, packages: Map<string, INpmPackage>) {
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
        packages.map(npmPackage => [
            npmPackage,
            flattenTree(npmPackage, p => Array.from(getDirectDepPackages(p, namedPackages)))
        ])
    );

    packages = [...packages]; // .sort() mutates original array, yet we prefer immutability
    packages.sort((package1, package2) => {
        if (packageToDeepDeps.get(package2)!.has(package1)) {
            return -1;
        } else if (packageToDeepDeps.get(package1)!.has(package2)) {
            return 1;
        } else {
            return 0;
        }
    });

    return packages;
}
