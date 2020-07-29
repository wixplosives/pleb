import fs from 'fs';
import path from 'path';
import findUp from 'find-up';
import type { PackageJson } from 'type-fest';
import { resolveWorkspacePackages } from './yarn-workspaces';
import { isPlainObject, isString } from './language-helpers';
import { INpmPackage, PACKAGE_JSON, resolveLinkedPackages, sortPackagesByDepth } from './npm-package';

export interface SinglePackageContext {
  type: 'single';
  npmPackage: INpmPackage;
}

export interface MultiPackageContext {
  type: 'multi';
  rootPackage: INpmPackage;
  packages: INpmPackage[];
}

export async function resolveDirectoryContext(basePath: string): Promise<SinglePackageContext | MultiPackageContext> {
  const packageJsonPath = await findUp(PACKAGE_JSON, { cwd: basePath });

  if (!isString(packageJsonPath)) {
    throw new Error(`Cannot find ${PACKAGE_JSON} for ${basePath}`);
  }

  const directoryPath = path.dirname(packageJsonPath);

  const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent) as PackageJson;
  if (!isPlainObject(packageJson)) {
    throw new Error(`${packageJsonPath} is not a valid json object.`);
  }

  const displayName = packageJson.name ? packageJson.name : packageJsonPath;

  const rootPackage: INpmPackage = {
    displayName,
    directoryPath,
    packageJson,
    packageJsonPath,
    packageJsonContent,
  };
  const { workspaces } = rootPackage.packageJson;

  if (workspaces !== undefined) {
    return {
      type: 'multi',
      rootPackage,
      packages: sortPackagesByDepth(await resolveWorkspacePackages(directoryPath, rootPackage.packageJson)),
    };
  }

  const linkedPackages = await resolveLinkedPackages(rootPackage);
  if (linkedPackages.length) {
    return {
      type: 'multi',
      rootPackage,
      packages: sortPackagesByDepth(linkedPackages),
    };
  }

  return {
    type: 'single',
    npmPackage: rootPackage,
  };
}

export function childPackagesFromContext(context: SinglePackageContext | MultiPackageContext): INpmPackage[] {
  return context.type === 'single' ? [context.npmPackage] : [...context.packages];
}

export function allPackagesFromContext(context: SinglePackageContext | MultiPackageContext): INpmPackage[] {
  return context.type === 'single' ? [context.npmPackage] : [context.rootPackage, ...context.packages];
}
