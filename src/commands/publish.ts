import fs from 'fs';
import path from 'path';
import type { SpawnSyncOptions } from 'child_process';
import { retry } from 'promise-assist';
import { npmPublishArgs, executePrepublishScripts, removePrepublishScripts } from '../utils/npm-publish';
import { resolveDirectoryContext, childPackagesFromContext } from '../utils/directory-context';
import { uriToIdentifier, NpmRegistry, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadEnvNpmConfig } from '../utils/npm-config';
import type { INpmPackage } from '../utils/npm-package';
import { log, logWarn } from '../utils/log';
import { spawnSyncLogged } from '../utils/process';

export interface PublishOptions {
  directoryPath: string;
  /** @default false */
  dryRun?: boolean;
  /** @default '.' */
  distDir?: string;
  /** @default .npmrc or official npm registry */
  registryUrl?: string;
  /** @default 'latest' */
  tag?: string;
}

export async function publish({
  directoryPath,
  dryRun = false,
  distDir = '.',
  registryUrl,
  tag = 'latest',
}: PublishOptions): Promise<void> {
  const directoryContext = await resolveDirectoryContext(directoryPath);
  const packages = childPackagesFromContext(directoryContext);
  const npmConfig = await loadEnvNpmConfig({ basePath: directoryPath });
  const resolvedRegistryUrl = registryUrl ?? npmConfig.registry ?? officialNpmRegistryUrl;
  const token = npmConfig[`${uriToIdentifier(resolvedRegistryUrl)}:_authToken`];
  const registry = new NpmRegistry(resolvedRegistryUrl, token);

  const filesToRestore = new Map<string, string>();
  try {
    const packagesToPublish = await getPackagesToPublish(packages, registry);

    if (packagesToPublish.length) {
      for (const npmPackage of packagesToPublish) {
        executePrepublishScripts(npmPackage);
      }

      for (const npmPackage of packagesToPublish) {
        await removePrepublishScripts(path.join(npmPackage.directoryPath, distDir, 'package.json'), filesToRestore);
      }

      const publishArgs = npmPublishArgs(registry, dryRun, tag);

      for (const npmPackage of packagesToPublish) {
        const spawnOptions: SpawnSyncOptions = {
          cwd: path.join(npmPackage.directoryPath, distDir),
          stdio: 'inherit',
          shell: true,
        };
        spawnSyncLogged('npm', publishArgs, spawnOptions, npmPackage.displayName);
        log(`${npmPackage.displayName}: done.`);
      }
    } else {
      log(`Nothing to publish.`);
    }
  } finally {
    for (const [filePath, fileContents] of filesToRestore) {
      await fs.promises.writeFile(filePath, fileContents);
    }
    filesToRestore.clear();
    registry.dispose();
  }
}

export async function getPackagesToPublish(packages: INpmPackage[], registry: NpmRegistry): Promise<INpmPackage[]> {
  const packagesToPublish: INpmPackage[] = [];
  for (const npmPackage of packages) {
    const { displayName, packageJson } = npmPackage;
    const { name: packageName, version: packageVersion } = packageJson;
    if (typeof packageName !== 'string') {
      logWarn(`${displayName}: no package name. skipping.`);
      continue;
    }
    if (packageJson.private) {
      logWarn(`${packageName}: private. skipping.`);
      continue;
    }
    if (typeof packageVersion !== 'string') {
      logWarn(`${packageName}: invalid version field. skipping.`);
      continue;
    }
    log(`${packageName}: fetching versions...`);
    const versions = await retry(() => registry.fetchVersions(packageName), {
      delay: 1000,
      retries: 3,
    });

    log(`${packageName}: got ${versions.length} published versions.`);
    if (!versions.length) {
      logWarn(`${packageName}: package was never published.`);
      packagesToPublish.push(npmPackage);
    } else if (!versions.includes(packageVersion)) {
      logWarn(`${packageName}: ${packageVersion} was never published.`);
      packagesToPublish.push(npmPackage);
    } else {
      logWarn(`${packageName}: ${packageVersion} is already published. skipping.`);
    }
  }
  return packagesToPublish;
}
