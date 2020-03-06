import fs from 'fs';
import path from 'path';
import findUp from 'find-up';
import { PackageJson } from 'type-fest';
import { resolveWorkspacePackages, extractWorkspacePackageLocations } from './yarn-workspaces';
import { isObject, isString } from './language-helpers';
import { INpmPackage, PACKAGE_JSON } from './npm-package';

export interface SinglePackageContext {
    type: 'single';
    npmPackage: INpmPackage;
}

export interface YarnWorkspaceContext {
    type: 'workspace';
    rootPackage: INpmPackage;
    packages: INpmPackage[];
}

export async function resolveDirectoryContext(basePath: string): Promise<SinglePackageContext | YarnWorkspaceContext> {
    const packageJsonPath = await findUp(PACKAGE_JSON, { cwd: basePath });

    if (!isString(packageJsonPath)) {
        throw new Error(`Cannot find ${PACKAGE_JSON} for ${basePath}`);
    }

    const directoryPath = path.dirname(packageJsonPath);

    const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
    const parsedJson = JSON.parse(packageJsonContent);
    if (!isObject(parsedJson)) {
        throw new Error(`${packageJsonPath} is not a valid json object.`);
    }

    const rootPackage: INpmPackage = {
        directoryPath,
        packageJson: parsedJson as PackageJson,
        packageJsonPath,
        packageJsonContent
    };
    const { workspaces } = rootPackage.packageJson;

    if (workspaces === undefined) {
        if (!isString(rootPackage.packageJson.name)) {
            throw new Error(`${packageJsonPath}: no valid "name" field. skipping.`);
        }
        return {
            type: 'single',
            npmPackage: rootPackage
        };
    } else {
        return {
            type: 'workspace',
            rootPackage,
            packages: await resolveWorkspacePackages(directoryPath, extractWorkspacePackageLocations(workspaces))
        };
    }
}

export function packagesFromResolvedContext(directoryContext: SinglePackageContext | YarnWorkspaceContext) {
    return directoryContext.type === 'single' ? [directoryContext.npmPackage] : directoryContext.packages;
}
