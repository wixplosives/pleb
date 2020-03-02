import fs from 'fs';
import path from 'path';
import util from 'util';
import globCb from 'glob';
import { logWarn } from './log';
import { isString, isObject, flattenTree } from './language-helpers';
import { INpmPackage, PACKAGE_JSON, IPackageJson, YarnWorkspacesFieldType, getDirectDepPackages } from './npm-package';

const glob = util.promisify(globCb);

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
            } else if (!isString(packageJson.name)) {
                logWarn(`${packageJsonPath}: no valid "name" field. skipping.`);
                continue;
            } else if (!isString(packageJson.version)) {
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

export function extractWorkspacePackageLocations(workspaces: YarnWorkspacesFieldType): string[] {
    if (isString(workspaces)) {
        return [workspaces];
    } else if (Array.isArray(workspaces)) {
        if (workspaces.every(isString)) {
            return workspaces;
        }
    } else if (isObject(workspaces)) {
        const { packages } = workspaces;
        if (isString(packages)) {
            return [packages];
        } else if (Array.isArray(packages) && packages.every(isString)) {
            return packages;
        }
    }
    throw new Error(`cannot extract package locations from "workspaces" field.`);
}
