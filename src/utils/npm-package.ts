import { PackageJson } from 'type-fest';

export const PACKAGE_JSON = 'package.json';

export interface INpmPackage {
    directoryPath: string;
    packageJsonPath: string;
    packageJsonContent: string;
    packageJson: PackageJson;
}

export function getDirectDepPackages(npmPackage: INpmPackage, packages: Map<string, INpmPackage>) {
    const depPackages = new Set<INpmPackage>();
    for (const depName of getPackageDependencyNames(npmPackage)) {
        const depPackage = packages.get(depName);
        if (depPackage && depPackage !== npmPackage) {
            depPackages.add(depPackage);
        }
    }
    return depPackages;
}

function getPackageDependencyNames({
    packageJson: { dependencies = {}, devDependencies = {}, peerDependencies = {} }
}: INpmPackage) {
    return new Set([...Object.keys(dependencies), ...Object.keys(devDependencies), ...Object.keys(peerDependencies)]);
}
