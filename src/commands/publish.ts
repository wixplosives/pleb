import { npmPublish } from '../utils/npm-publish';
import { resolveDirectoryContext, childPackagesFromContext } from '../utils/directory-context';
import { uriToIdentifier, NpmRegistry, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadEnvNpmConfig } from '../utils/npm-config';

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

export async function publish({ directoryPath, dryRun, distDir, registryUrl, tag }: PublishOptions): Promise<void> {
  const directoryContext = await resolveDirectoryContext(directoryPath);
  const packages = childPackagesFromContext(directoryContext);
  const npmConfig = await loadEnvNpmConfig({ basePath: directoryPath });
  const resolvedRegistryUrl = registryUrl ?? npmConfig.registry ?? officialNpmRegistryUrl;
  const token = npmConfig[`${uriToIdentifier(resolvedRegistryUrl)}:_authToken`];
  const registry = new NpmRegistry(resolvedRegistryUrl, token);

  try {
    for (const npmPackage of packages) {
      await npmPublish({
        npmPackage,
        registry,
        dryRun,
        distDir,
        tag,
      });
    }
  } finally {
    registry.dispose();
  }
}
