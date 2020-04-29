import fs from 'fs';
import { npmPublish } from '../utils/npm-publish';
import { resolveDirectoryContext, childPackagesFromContext } from '../utils/directory-context';
import { uriToIdentifier, officialNpmRegistryUrl, NpmRegistry } from '../utils/npm-registry';
import { loadEnvNpmConfig } from '../utils/npm-config';
import { currentGitCommitHash } from '../utils/git';
import { INpmPackage } from '../utils/npm-package';
import { mapRecord, isString } from '../utils/language-helpers';
import { log } from '../utils/log';

export interface SnapshotOptions {
  directoryPath: string;
  /** @default false */
  dryRun?: boolean;
  /** @default '.' */
  contents: string;
  /** @default .npmrc or official npm registry */
  registryUrl?: string;
  /** @default 'next' */
  tag?: string;
}

export async function snapshot({
  directoryPath,
  dryRun,
  contents,
  registryUrl,
  tag = 'next',
}: SnapshotOptions): Promise<void> {
  const directoryContext = await resolveDirectoryContext(directoryPath);
  const packages = childPackagesFromContext(directoryContext);
  const commitHash = currentGitCommitHash(directoryPath);
  if (!commitHash) {
    throw new Error(`cannot determine git commit hash for ${directoryPath}`);
  }
  const npmConfig = await loadEnvNpmConfig({ basePath: directoryPath });
  const resolvedRegistryUrl = registryUrl ?? npmConfig.registry ?? officialNpmRegistryUrl;
  const token = npmConfig[`${uriToIdentifier(resolvedRegistryUrl)}:_authToken`];
  const registry = new NpmRegistry(resolvedRegistryUrl, token);

  const packagesWithHashes = appendVersionHashes(packages, commitHash);

  try {
    for (const { packageJson, packageJsonPath, packageJsonContent } of packagesWithHashes) {
      log(`${packageJson.name ?? packageJsonPath}: updating versions in package.json`);
      await fs.promises.writeFile(packageJsonPath, packageJsonContent);
    }
    for (const npmPackage of packagesWithHashes) {
      await npmPublish({
        npmPackage,
        registry,
        tag,
        dryRun,
        distDir: contents,
      });
    }
  } finally {
    registry.dispose();
    for (const { packageJsonPath, packageJsonContent } of packages) {
      await fs.promises.writeFile(packageJsonPath, packageJsonContent);
    }
  }
}

function appendVersionHashes(packages: INpmPackage[], commitHash: string) {
  const packageToVersion = new Map<string, string>(
    packages
      .filter(({ packageJson }) => isString(packageJson.name) && isString(packageJson.version))
      .map(({ packageJson }) => [packageJson.name!, `${packageJson.version!}-${commitHash.slice(0, 7)}`])
  );

  const getVersionRequest = (packageName: string, currentRequest: string) =>
    packageToVersion.get(packageName) ?? currentRequest;

  const packagesWithHashes: INpmPackage[] = [];
  for (const npmPackage of packages) {
    const packageJson = { ...npmPackage.packageJson };
    const { name: packageName, dependencies, devDependencies } = packageJson;
    if (isString(packageName) && packageToVersion.has(packageName)) {
      packageJson.version = packageToVersion.get(packageName)!;
    }
    if (dependencies) {
      packageJson.dependencies = mapRecord(dependencies, getVersionRequest);
    }
    if (devDependencies) {
      packageJson.devDependencies = mapRecord(devDependencies, getVersionRequest);
    }
    packagesWithHashes.push({
      ...npmPackage,
      packageJson,
      packageJsonContent: JSON.stringify(packageJson, null, 2),
    });
  }
  return packagesWithHashes;
}
