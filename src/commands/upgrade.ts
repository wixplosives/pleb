/* eslint-disable no-console */
import { allPackagesFromContext, isString, resolveDirectoryContext } from '@wixc3/resolve-directory-context';
import fs from 'node:fs';
import path from 'node:path';
import PromiseQueue from 'p-queue';
import semver from 'semver';
import { createCliProgressBar } from '../utils/cli-progress-bar.js';
import { loadPlebConfig, normalizePinnedPackages } from '../utils/config.js';
import { loadEnvNpmConfig } from '../utils/npm-config.js';
import { NpmRegistry, officialNpmRegistryUrl, uriToIdentifier } from '../utils/npm-registry.js';

const { gt, coerce } = semver;

type RequiredRegistryApi = Pick<NpmRegistry, 'fetchDistTags' | 'dispose'>;

export interface UpgradeOptions {
  directoryPath: string;
  dryRun?: boolean;
  registryUrl?: string;
  createRegistry?: (url: string, token?: string) => RequiredRegistryApi;
  log?: (message: unknown) => void;
  logError?: (message: unknown) => void;
}

function createDefaultRegistry(url: string, token?: string) {
  return new NpmRegistry(url, token);
}

export async function upgrade({
  directoryPath,
  registryUrl,
  dryRun,
  createRegistry = createDefaultRegistry,
  log = console.log,
  logError = console.error,
}: UpgradeOptions): Promise<void> {
  const directoryContext = resolveDirectoryContext(directoryPath, { ...fs, ...path });
  const packages = allPackagesFromContext(directoryContext);
  const plebConfig = await loadPlebConfig(directoryPath);
  const pinnedPackages = normalizePinnedPackages(plebConfig.pinnedPackages);
  const npmConfig = await loadEnvNpmConfig({ basePath: directoryPath });
  const resolvedRegistryUrl = registryUrl ?? npmConfig['registry'] ?? officialNpmRegistryUrl;
  const token = npmConfig[`${uriToIdentifier(resolvedRegistryUrl)}:_authToken`];
  const registry = createRegistry(resolvedRegistryUrl, token);

  const internalPackageNames = new Set<string>(packages.map(({ packageJson }) => packageJson.name!));

  const externalPackageNames = new Set(
    packages.flatMap(({ packageJson: { dependencies = {}, devDependencies = {} } }) =>
      [...Object.entries(dependencies), ...Object.entries(devDependencies)]
        .filter(
          ([packageName, packageVersion]) =>
            !internalPackageNames.has(packageName) &&
            !isFileColonRequest(packageVersion!) &&
            !(packageName === '@types/node' && isPureNumericRequest(packageVersion!)),
        )
        .map(([packageName]) => packageName),
    ),
  );

  log(`Getting "latest" version for ${externalPackageNames.size} dependencies...`);
  const packageNameToVersion = await fetchLatestPackageVersions({
    packageNames: externalPackageNames,
    registry,
    logError,
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

  const replacements = new Map<string, { originalValue: string; newValue: string }>();
  const skipped = new Map<string, { originalValue: string; newValue: string; reason: string }>();

  function mapDependencies(obj: Partial<Record<string, string>>): Partial<Record<string, string>> {
    const newObj: Partial<Record<string, string>> = {};
    for (const [packageName, request] of Object.entries(obj)) {
      const newVersionRequest = getVersionRequest(packageName, request!);
      newObj[packageName] = request;

      if (newVersionRequest !== request) {
        if (pinnedPackages.has(packageName)) {
          skipped.set(packageName, {
            originalValue: request!,
            newValue: newVersionRequest,
            reason: pinnedPackages.get(packageName)!,
          });
        } else {
          replacements.set(packageName, { originalValue: request!, newValue: newVersionRequest });
          newObj[packageName] = newVersionRequest;
        }
      }
    }
    return newObj;
  }

  for (const { packageJsonPath, packageJson, packageJsonContent } of packages) {
    const { dependencies, devDependencies } = packageJson;
    const newPackageJson = { ...packageJson };
    if (dependencies) {
      newPackageJson.dependencies = mapDependencies(dependencies);
    }
    if (devDependencies) {
      newPackageJson.devDependencies = mapDependencies(devDependencies);
    }

    if (!dryRun) {
      // retain original EOL. JSON.stringify always outputs \n.
      const newPackageJsonContent = JSON.stringify(newPackageJson, null, 2) + '\n';
      const normalizedNewPackageJsonContent = packageJsonContent.includes('\r\n')
        ? newPackageJsonContent.replace(/\n/g, '\r\n')
        : newPackageJsonContent;
      await fs.promises.writeFile(packageJsonPath, normalizedNewPackageJsonContent);
    }
  }
  if (replacements.size) {
    log('Changes:');
    const maxKeyLength = Array.from(replacements.keys()).reduce((acc, key) => Math.max(acc, key.length), 0);
    for (const [key, { originalValue, newValue }] of replacements) {
      log(`  ${key.padEnd(maxKeyLength + 2)} ${originalValue.padStart(8)} -> ${newValue}`);
    }
  }

  if (skipped.size) {
    log('Skipped:');
    const maxKeyLength = Array.from(skipped.keys()).reduce((acc, key) => Math.max(acc, key.length), 0);
    for (const [key, { originalValue, reason, newValue }] of skipped) {
      log(
        `  ${key.padEnd(maxKeyLength + 2)} ${originalValue.padStart(8)} -> ${newValue}` +
          (reason ? ` (${reason})` : ``),
      );
    }
  }

  if (!replacements.size) {
    log('Nothing to upgrade.');
  }
}

export interface IFetchLatestPackageVersionsOptions {
  registry: RequiredRegistryApi;
  packageNames: Set<string>;
  logError: (message: unknown) => void;
}

export async function fetchLatestPackageVersions({
  registry,
  packageNames,
  logError,
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
        logError((e as Error)?.message || e);
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
