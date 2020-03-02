import { publishNpmPackage } from '../utils/publish-npm-package';
import { resolveDirectoryContext, packagesFromResolvedContext } from '../utils/directory-context';
import { uriToIdentifier, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadNpmConfig } from '../utils/npm-config';

export interface PublishOptions {
    directoryPath: string;
    dryRun?: boolean;
    contents?: string;
}

export async function publish({ directoryPath, dryRun, contents }: PublishOptions): Promise<void> {
    const directoryContext = await resolveDirectoryContext(directoryPath);
    const packages = packagesFromResolvedContext(directoryContext);
    const npmConfig = loadNpmConfig();
    const registryKey = uriToIdentifier(officialNpmRegistryUrl);
    const token = npmConfig[`${registryKey}:_authToken`];
    for (const npmPackage of packages) {
        await publishNpmPackage({ npmPackage, dryRun, distDir: contents, registry: officialNpmRegistryUrl, token });
    }
}
