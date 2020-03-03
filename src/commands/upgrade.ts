/* eslint-disable no-console */
import fs from 'fs';
import http from 'http';
import https from 'https';
import { resolveDirectoryContext } from '../utils/directory-context';
import { fetchLatestPackageVersions, uriToIdentifier, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadNpmConfig } from '../utils/npm-config';
import { mapRecord, isString } from '../utils/language-helpers';
import { ensurePostfixSlash, isSecureUrl } from '../utils/http';

export interface UpgradeOptions {
    directoryPath: string;
    dryRun?: boolean;
    registryUrl?: string;
}

export async function upgrade({ directoryPath, registryUrl: forcedRegistry, dryRun }: UpgradeOptions): Promise<void> {
    const directoryContext = await resolveDirectoryContext(directoryPath);
    const packages =
        directoryContext.type === 'workspace'
            ? [directoryContext.rootPackage, ...directoryContext.packages]
            : [directoryContext.npmPackage];

    const npmConfig = await loadNpmConfig(directoryPath);
    const registryUrl = ensurePostfixSlash(forcedRegistry ?? npmConfig.registry ?? officialNpmRegistryUrl);
    const registryKey = uriToIdentifier(registryUrl);
    const token = npmConfig[`${registryKey}:_authToken`];

    const internalPackageNames = new Set<string>(packages.map(({ packageJson }) => packageJson.name));

    const externalPackageNames = new Set(
        packages
            .flatMap(({ packageJson: { dependencies = {}, devDependencies = {} } }) => [
                ...Object.keys(dependencies),
                ...Object.keys(devDependencies)
            ])
            .filter(packageName => !internalPackageNames.has(packageName))
    );

    const agent = isSecureUrl(registryUrl) ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });
    console.log(`Getting "latest" version for ${externalPackageNames.size} dependencies...`);
    const packageNameToVersion = await fetchLatestPackageVersions({
        packageNames: externalPackageNames,
        agent,
        token,
        registryUrl
    });
    agent.destroy();

    for (const { packageJson } of packages) {
        if (isString(packageJson.version)) {
            packageNameToVersion.set(packageJson.name, packageJson.version);
        }
    }

    const getVersionRequest = (packageName: string, currentRequest: string): string => {
        const latestVersion = packageNameToVersion.get(packageName);
        if (latestVersion !== undefined) {
            return currentRequest.startsWith('~') ? `~${latestVersion}` : `^${latestVersion}`;
        } else {
            return currentRequest;
        }
    };

    if (!dryRun) {
        for (const { packageJsonPath, packageJson } of packages) {
            const { dependencies, devDependencies } = packageJson;
            const newPackageJson = { ...packageJson };
            if (dependencies) {
                newPackageJson.dependencies = mapRecord(dependencies, getVersionRequest);
            }
            if (devDependencies) {
                newPackageJson.devDependencies = mapRecord(devDependencies, getVersionRequest);
            }
            await fs.promises.writeFile(packageJsonPath, JSON.stringify(newPackageJson, null, 2) + '\n');
        }
    }
}
