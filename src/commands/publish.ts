import { publishNpmPackage } from '../utils/publish-npm-package';
import { resolveDirectoryContext, packagesFromResolvedContext } from '../utils/directory-context';
import { uriToIdentifier, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadNpmConfig } from '../utils/npm-config';
import { ensurePostfixSlash } from '../utils/http';

export interface PublishOptions {
    directoryPath: string;
    dryRun?: boolean;
    contents?: string;
    registryUrl?: string;
}

export async function publish({
    directoryPath,
    dryRun,
    contents,
    registryUrl: forcedRegistry
}: PublishOptions): Promise<void> {
    const directoryContext = await resolveDirectoryContext(directoryPath);
    const packages = packagesFromResolvedContext(directoryContext);
    const npmConfig = await loadNpmConfig(directoryPath);
    const registryUrl = ensurePostfixSlash(forcedRegistry ?? npmConfig.registry ?? officialNpmRegistryUrl);
    const registryKey = uriToIdentifier(registryUrl);
    const token = npmConfig[`${registryKey}:_authToken`];

    for (const npmPackage of packages) {
        await publishNpmPackage({ npmPackage, dryRun, distDir: contents, registryUrl, token });
    }
}
