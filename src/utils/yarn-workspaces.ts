import fs from 'fs';
import path from 'path';
import util from 'util';
import globCb from 'glob';
import { PackageJson } from 'type-fest';
import { logWarn } from './log';
import { isString, isObject } from './language-helpers';
import { INpmPackage, PACKAGE_JSON, sortPackagesByDepth } from './npm-package';

const glob = util.promisify(globCb);

export async function resolveWorkspacePackages(basePath: string, packageJson: PackageJson): Promise<INpmPackage[]> {
  const workspaces = extractPackageLocations(packageJson.workspaces);
  const packages: INpmPackage[] = [];
  const globOptions: globCb.IOptions = {
    cwd: basePath,
    absolute: true,
  };
  for (const packageDirGlob of workspaces) {
    const packageJsonGlob = path.posix.join(packageDirGlob, PACKAGE_JSON);
    const packageJsonPaths = await glob(packageJsonGlob, globOptions);
    for (const packageJsonPath of packageJsonPaths.map(path.normalize)) {
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;
      if (!isObject(packageJson)) {
        logWarn(`${packageJsonPath}: no valid json object.`);
        continue;
      }
      packages.push({
        packageJsonPath,
        packageJson,
        directoryPath: path.dirname(packageJsonPath),
        packageJsonContent,
      });
    }
  }

  return sortPackagesByDepth(packages);
}

export function extractPackageLocations(workspaces: PackageJson.YarnConfiguration['workspaces']): string[] {
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
      return packages as string[];
    }
  }
  throw new Error(`cannot extract package locations from "workspaces" field.`);
}
