import fs from 'fs';
import path from 'path';
import findUp from 'find-up';
import glob from 'glob';
import { logWarn } from './log';

const PACKAGE_JSON = 'package.json';
const isValidPackageJson = (value: unknown): value is IPackageJson => typeof value === 'object' && value !== null;

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
    packageJson: IPackageJson;
}

export function resolvePackages(basePath: string): INpmPackage[] {
    const packageJsonPath = findUp.sync(PACKAGE_JSON, { cwd: basePath });

    if (typeof packageJsonPath !== 'string') {
        throw new Error(`Cannot find ${PACKAGE_JSON} for ${basePath}`);
    }

    const directoryPath = path.dirname(packageJsonPath);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!isValidPackageJson(packageJson)) {
        throw new Error(`${packageJsonPath} is not a valid json object.`);
    }

    const { workspaces } = packageJson;

    if (workspaces === undefined) {
        return packageJson.name ? [{ directoryPath, packageJson, packageJsonPath } as INpmPackage] : [];
    } else if (typeof workspaces === 'string') {
        return resolveWorkspacePackages(directoryPath, [workspaces]);
    } else if (Array.isArray(workspaces)) {
        return resolveWorkspacePackages(directoryPath, workspaces);
    } else {
        throw new Error(`"workspaces" key has unknown type: ${typeof workspaces}`);
    }
}

export function resolveWorkspacePackages(basePath: string, workspaces: string[]): INpmPackage[] {
    const foundPackages: INpmPackage[] = [];

    const globOptions: glob.IOptions = {
        cwd: basePath,
        absolute: true
    };

    for (const packageDirGlob of workspaces) {
        const packageJsonGlob = path.posix.join(packageDirGlob, PACKAGE_JSON);

        for (const packageJsonPath of glob.sync(packageJsonGlob, globOptions).map(path.normalize)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as IPackageJson;
            if (!isValidPackageJson(packageJson)) {
                throw new Error(`${packageJsonPath} is not a valid json object.`);
            } else if (typeof packageJson.name !== 'string') {
                logWarn(`${packageJsonPath}: no valid "name" field. skipping.`);
                continue;
            } else if (typeof packageJson.version !== 'string') {
                logWarn(`${packageJsonPath}: no valid "version" field. skipping.`);
                continue;
            }
            foundPackages.push({
                packageJsonPath,
                packageJson,
                directoryPath: path.dirname(packageJsonPath)
            });
        }
    }
    return foundPackages;
}
