import { childPackagesFromContext, resolveDirectoryContext } from '@wixc3/resolve-directory-context';
import type { SpawnSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { log } from '../utils/log.js';
import { loadEnvNpmConfig } from '../utils/npm-config.js';
import { getPackagesToPublish } from '../utils/npm-publish.js';
import { NpmRegistry, officialNpmRegistryUrl, uriToIdentifier } from '../utils/npm-registry.js';
import { spawnSyncLogged } from '../utils/process.js';

export interface PublishOptions {
  directoryPath: string;
  /** @default false */
  dryRun?: boolean;
  /** @default .npmrc or official npm registry */
  registryUrl?: string;
  /** @default 'latest' */
  tag?: string;
}

export async function publish({
  directoryPath,
  dryRun = false,
  registryUrl,
  tag = 'latest',
}: PublishOptions): Promise<void> {
  const directoryContext = resolveDirectoryContext(directoryPath, { ...fs, ...path });
  const packages = childPackagesFromContext(directoryContext);
  const npmConfig = await loadEnvNpmConfig({ basePath: directoryPath });
  const resolvedRegistryUrl = registryUrl ?? npmConfig['registry'] ?? officialNpmRegistryUrl;
  const token = npmConfig[`${uriToIdentifier(resolvedRegistryUrl)}:_authToken`];
  const registry = new NpmRegistry(resolvedRegistryUrl, token);

  try {
    const packagesToPublish = await getPackagesToPublish(packages, registry);

    if (packagesToPublish.length) {
      const publishArgs: string[] = ['publish', '--registry', registry.url];
      if (dryRun) {
        publishArgs.push('--dry-run');
      }
      if (tag !== 'latest') {
        publishArgs.push('--tag', tag);
      }

      for (const npmPackage of packagesToPublish) {
        const spawnOptions: SpawnSyncOptions = {
          cwd: npmPackage.directoryPath,
          stdio: 'inherit',
          shell: true,
        };
        spawnSyncLogged(`npm ${publishArgs.join(' ')}`, spawnOptions, npmPackage.displayName);
        log(`${npmPackage.displayName}: done.`);
      }
    } else {
      log(`Nothing to publish.`);
    }
  } finally {
    registry.dispose();
  }
}
