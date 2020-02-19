import { publishNpmPackage } from '../utils/publish-npm-package';
import { resolvePackages } from '../utils/packages';
import { loadNpmConfig, uriToIdentifier, officialNpmRegistry } from '../utils/npm';

export interface PublishOptions {
    directoryPath: string;
    dryRun?: boolean;
    contents?: string;
}
export async function publish({ directoryPath, dryRun, contents }: PublishOptions) {
    const packages = await resolvePackages(directoryPath);
    const npmConfig = loadNpmConfig();
    const registryKey = uriToIdentifier(officialNpmRegistry);
    const token = npmConfig[`${registryKey}:_authToken`];
    for (const npmPackage of packages) {
        await publishNpmPackage({ npmPackage, dryRun, distDir: contents, registry: officialNpmRegistry, token });
    }
}
