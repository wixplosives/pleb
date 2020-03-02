/* eslint-disable no-console */
import fs from 'fs';
import https from 'https';
import { resolveDirectoryContext } from '../utils/directory-context';
import { fetchLatestPackageVersions, uriToIdentifier, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadNpmConfig } from '../utils/npm-config';
import { mapRecord, isString } from '../utils/language-helpers';

export interface UpgradeOptions {
    directoryPath: string;
    registryUrl?: string;
    dryRun?: boolean;
}

export async function upgrade({
    directoryPath,
    registryUrl = officialNpmRegistryUrl,
    dryRun
}: UpgradeOptions): Promise<void> {
    const directoryContext = await resolveDirectoryContext(directoryPath);
    const packages =
        directoryContext.type === 'workspace'
            ? [directoryContext.rootPackage, ...directoryContext.packages]
            : [directoryContext.npmPackage];
    const npmConfig = loadNpmConfig();
    const registryKey = uriToIdentifier(officialNpmRegistryUrl);
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

    const agent = new https.Agent({ keepAlive: true });
    console.log(`Getting "latest" version for ${externalPackageNames.size} dependencies...`);
    const packageNameToVersion = await fetchLatestPackageVersions(externalPackageNames, agent, token, registryUrl);
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
