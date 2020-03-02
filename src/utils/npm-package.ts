export const PACKAGE_JSON = 'package.json';

export type YarnWorkspacesFieldType =
    | string
    | string[]
    | {
          packages?: string | string[];
      };

export interface IPackageJson {
    name: string;
    version: string;
    scripts?: Record<string, string>;
    workspaces?: YarnWorkspacesFieldType;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    private?: boolean;
}

export interface INpmPackage {
    directoryPath: string;
    packageJsonPath: string;
    packageJsonContent: string;
    packageJson: IPackageJson;
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
