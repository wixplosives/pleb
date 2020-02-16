import fs from 'fs';
import path from 'path';
import util from 'util';
import findUp from 'find-up';
import globCb from 'glob';
import { flattenTree } from './flatten-tree';
import { logWarn } from './log';

const glob = util.promisify(globCb);

const PACKAGE_JSON = 'package.json';
const isObject = (value: unknown): value is IPackageJson => typeof value === 'object' && value !== null;

export interface IPackageJson {
    name: string;
    version: string;
    scripts?: Record<string, string>;
    workspaces?: string | string[];
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

export async function resolvePackages(basePath: string): Promise<INpmPackage[]> {
    const packageJsonPath = await findUp(PACKAGE_JSON, { cwd: basePath });

    if (typeof packageJsonPath !== 'string') {
        throw new Error(`Cannot find ${PACKAGE_JSON} for ${basePath}`);
    }

    const directoryPath = path.dirname(packageJsonPath);

    const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    if (!isObject(packageJson)) {
        throw new Error(`${packageJsonPath} is not a valid json object.`);
    }

    const { workspaces } = packageJson;

    if (workspaces === undefined) {
        if (typeof packageJson.name !== 'string') {
            logWarn(`${packageJsonPath}: no valid "name" field. skipping.`);
            return [];
        }
        return [{ directoryPath, packageJson, packageJsonPath, packageJsonContent }];
    } else if (typeof workspaces === 'string') {
        return resolveWorkspacePackages(directoryPath, [workspaces]);
    } else if (Array.isArray(workspaces)) {
        return resolveWorkspacePackages(directoryPath, workspaces);
    } else {
        throw new Error(`"workspaces" key has unknown type: ${typeof workspaces}`);
    }
}

export async function resolveWorkspacePackages(basePath: string, workspaces: string[]): Promise<INpmPackage[]> {
    const packageMap = new Map<string, INpmPackage>();

    const globOptions: globCb.IOptions = {
        cwd: basePath,
        absolute: true
    };

    for (const packageDirGlob of workspaces) {
        const packageJsonGlob = path.posix.join(packageDirGlob, PACKAGE_JSON);
        const packageJsonPaths = await glob(packageJsonGlob, globOptions);
        for (const packageJsonPath of packageJsonPaths.map(path.normalize)) {
            const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent) as IPackageJson;

            if (!isObject(packageJson)) {
                logWarn(`${packageJsonPath}: no valid json object.`);
                continue;
            } else if (typeof packageJson.name !== 'string') {
                logWarn(`${packageJsonPath}: no valid "name" field. skipping.`);
                continue;
            } else if (typeof packageJson.version !== 'string') {
                logWarn(`${packageJsonPath}: no valid "version" field. skipping.`);
                continue;
            } else if (packageMap.has(packageJson.name)) {
                logWarn(
                    `${packageJsonPath}: duplicate package name. "${packageJson.name}" is already used at ${
                        packageMap.get(packageJson.name)!.packageJsonPath
                    }`
                );
                continue;
            }

            packageMap.set(packageJson.name, {
                packageJsonPath,
                packageJson,
                directoryPath: path.dirname(packageJsonPath),
                packageJsonContent
            });
        }
    }

    const packages = Array.from(packageMap.values());
    const packageToDeepDeps = new Map<INpmPackage, Set<INpmPackage>>(
        packages.map(npmPackage => [
            npmPackage,
            flattenTree(npmPackage, p => Array.from(getDirectDepPackages(p, packageMap)))
        ])
    );

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

function getDirectDepPackages(npmPackage: INpmPackage, packages: Map<string, INpmPackage>) {
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
