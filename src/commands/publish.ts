import fs from 'fs';
import path from 'path';
import type { SpawnSyncOptions } from 'child_process';
import { resolveDirectoryContext, childPackagesFromContext } from '@wixc3/resolve-directory-context';
import {
  npmPublishArgs,
  executePrepublishScripts,
  removePrepublishScripts,
  getPackagesToPublish,
} from '../utils/npm-publish.js';
import { uriToIdentifier, NpmRegistry, officialNpmRegistryUrl } from '../utils/npm-registry.js';
import { loadEnvNpmConfig } from '../utils/npm-config.js';
import { log } from '../utils/log.js';
import { spawnSyncLogged } from '../utils/process.js';

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
  const directoryContext = resolveDirectoryContext(directoryPath);
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
