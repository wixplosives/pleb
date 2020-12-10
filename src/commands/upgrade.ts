/* eslint-disable no-console */
import fs from 'fs';
import PromiseQueue from 'p-queue';
import { gt, coerce } from 'semver';
import { createCliProgressBar } from '../utils/cli-progress-bar';
import { resolveDirectoryContext, allPackagesFromContext } from '../utils/directory-context';
import { uriToIdentifier, officialNpmRegistryUrl, NpmRegistry } from '../utils/npm-registry';
import { loadEnvNpmConfig } from '../utils/npm-config';
import { mapRecord, isString } from '../utils/language-helpers';

export interface UpgradeOptions {
  directoryPath: string;
  dryRun?: boolean;
  registryUrl?: string;
}

export async function upgrade({ directoryPath, registryUrl, dryRun }: UpgradeOptions): Promise<void> {
  const directoryContext = await resolveDirectoryContext(directoryPath);
  const packages = allPackagesFromContext(directoryContext);

  const npmConfig = await loadEnvNpmConfig({ basePath: directoryPath });
  const resolvedRegistryUrl = registryUrl ?? npmConfig.registry ?? officialNpmRegistryUrl;
  const token = npmConfig[`${uriToIdentifier(resolvedRegistryUrl)}:_authToken`];
  const registry = new NpmRegistry(resolvedRegistryUrl, token);

  const internalPackageNames = new Set<string>(packages.map(({ packageJson }) => packageJson.name!));

  const externalPackageNames = new Set(
    packages.flatMap(({ packageJson: { dependencies = {}, devDependencies = {} } }) =>
      [...Object.entries(dependencies), ...Object.entries(devDependencies)]
        .filter(
          ([packageName, packageVersion]) =>
            !internalPackageNames.has(packageName) &&
            !isFileColonRequest(packageVersion) &&
            !(packageName === '@types/node' && isPureNumericRequest(packageVersion))
        )
        .map(([packageName]) => packageName)
    )
  );

  console.log(`Getting "latest" version for ${externalPackageNames.size} dependencies...`);
  const packageNameToVersion = await fetchLatestPackageVersions({
    packageNames: externalPackageNames,
    registry,
  });
  registry.dispose();

  for (const {
    packageJson: { name: packageName, version: packageVersion },
  } of packages) {
    if (isString(packageName) && isString(packageVersion)) {
      packageNameToVersion.set(packageName, packageVersion);
    }
  }

  const getVersionRequest = (packageName: string, currentRequest: string): string => {
    const latestVersion = packageNameToVersion.get(packageName);
    const currentRequestAsSemver = coerce(currentRequest);
    if (
      latestVersion !== undefined &&
      !isFileColonRequest(currentRequest) &&
      (!currentRequestAsSemver || !gt(currentRequestAsSemver, latestVersion))
    ) {
      return currentRequest.startsWith('~') ? `~${latestVersion}` : `^${latestVersion}`;
    } else {
      return currentRequest;
    }
  };

  if (!dryRun) {
    for (const { packageJsonPath, packageJson, packageJsonContent } of packages) {
      const { dependencies, devDependencies } = packageJson;
      const newPackageJson = { ...packageJson };
      if (dependencies) {
        newPackageJson.dependencies = mapRecord(dependencies, getVersionRequest);
      }
      if (devDependencies) {
        newPackageJson.devDependencies = mapRecord(devDependencies, getVersionRequest);
      }

      // retain original EOL. JSON.stringify always outputs \n.
      const newPackageJsonContent = JSON.stringify(newPackageJson, null, 2) + '\n';
      const normalizedNewPackageJsonContent = packageJsonContent.includes('\r\n')
        ? newPackageJsonContent.replace(/\n/g, '\r\n')
        : newPackageJsonContent;
      await fs.promises.writeFile(packageJsonPath, normalizedNewPackageJsonContent);
    }
  }
}

export interface IFetchLatestPackageVersionsOptions {
  registry: NpmRegistry;
  packageNames: Set<string>;
}

export async function fetchLatestPackageVersions({
  registry,
  packageNames,
}: IFetchLatestPackageVersionsOptions): Promise<Map<string, string>> {
  const cliProgress = createCliProgressBar();
  const packageNameToVersion = new Map<string, string>();
  const fetchQueue = new PromiseQueue({ concurrency: 8 });
  const fetchPromises: Promise<void>[] = [];

  for (const packageName of packageNames) {
    const fetchPromise = fetchQueue.add(async () => {
      try {
        const distTags: unknown = await registry.fetchDistTags(packageName);
        const { latest } = distTags as Record<string, string | undefined>;
        if (!isString(latest)) {
          throw new Error(`expected latest to be a string, but got ${String(latest)}`);
        }
        packageNameToVersion.set(packageName, latest);
      } catch (e) {
        console.error((e as Error)?.message || e);
      }
      cliProgress.update((packageNames.size - fetchQueue.size) / packageNames.size);
    });
    fetchPromises.push(fetchPromise);
  }
  await Promise.all(fetchPromises);
  cliProgress.done();
  return packageNameToVersion;
}

function isFileColonRequest(request: string) {
  return request.startsWith('file:');
}

function isPureNumericRequest(request: string) {
  if (!request.length) {
    return false;
  }
  for (const character of request) {
    if (!isDigit(character)) {
      return false;
    }
  }
  return true;
}

function isDigit(c: string) {
  return c >= '0' && c <= '9';
}
