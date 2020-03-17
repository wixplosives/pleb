import http from 'http';
import https from 'https';
import { publishNpmPackage } from '../utils/publish-npm-package';
import { resolveDirectoryContext, childPackagesFromContext } from '../utils/directory-context';
import { uriToIdentifier, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadNpmConfig } from '../utils/npm-config';
import { isSecureUrl } from '../utils/http';

export interface PublishOptions {
    directoryPath: string;
    /** @default false */
    dryRun?: boolean;
    /** @default '.' */
    contents: string;
    /** @default .npmrc or official npm registry */
    registryUrl?: string;
    /** @default 'latest' */
    tag?: string;
    /** @default false */
    printConfig?: boolean;
}

export async function publish({
    directoryPath,
    dryRun,
    contents,
    registryUrl: forcedRegistry,
    tag,
    printConfig
}: PublishOptions): Promise<void> {
    const directoryContext = await resolveDirectoryContext(directoryPath);
    const packages = childPackagesFromContext(directoryContext);
    const npmConfig = await loadNpmConfig({ basePath: directoryPath, printConfig });
    const registryUrl = forcedRegistry ?? npmConfig.registry ?? officialNpmRegistryUrl;
    const registryKey = uriToIdentifier(registryUrl);
    const token = npmConfig[`${registryKey}:_authToken`];
    const agent = isSecureUrl(registryUrl) ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });

    try {
        for (const npmPackage of packages) {
            await publishNpmPackage({ npmPackage, dryRun, distDir: contents, registryUrl, token, agent, tag });
        }
    } finally {
        agent.destroy();
    }
}
