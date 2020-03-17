/* eslint-disable no-console */
import fs from 'fs';
import http from 'http';
import https from 'https';
import PromiseQueue from 'p-queue';
import { createCliProgressBar } from '../utils/cli-progress-bar';
import { resolveDirectoryContext, allPackagesFromContext } from '../utils/directory-context';
import { uriToIdentifier, officialNpmRegistryUrl, fetchPackageDistTags } from '../utils/npm-registry';
import { loadNpmConfig } from '../utils/npm-config';
import { mapRecord, isString } from '../utils/language-helpers';
import { isSecureUrl } from '../utils/http';

export interface UpgradeOptions {
    directoryPath: string;
    dryRun?: boolean;
    registryUrl?: string;
    printConfig?: boolean;
}

export async function upgrade({
    directoryPath,
    registryUrl: forcedRegistry,
    dryRun,
    printConfig
}: UpgradeOptions): Promise<void> {
    const directoryContext = await resolveDirectoryContext(directoryPath);
    const packages = allPackagesFromContext(directoryContext);

    const npmConfig = await loadNpmConfig({ basePath: directoryPath, printConfig });
    const registryUrl = forcedRegistry ?? npmConfig.registry ?? officialNpmRegistryUrl;
    const registryKey = uriToIdentifier(registryUrl);
    const token = npmConfig[`${registryKey}:_authToken`];

    const internalPackageNames = new Set<string>(packages.map(({ packageJson }) => packageJson.name!));

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
            packageNameToVersion.set(packageJson.name!, packageJson.version);
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

export interface IFetchLatestPackageVersionsOptions {
    packageNames: Set<string>;
    registryUrl: string;
    agent?: http.Agent | https.Agent;
    token?: string;
}

export async function fetchLatestPackageVersions({
    packageNames,
    agent,
    token,
    registryUrl
}: IFetchLatestPackageVersionsOptions): Promise<Map<string, string>> {
    const cliProgress = createCliProgressBar();
    const packageNameToVersion = new Map<string, string>();
    const fetchQueue = new PromiseQueue({ concurrency: 8 });
    const fetchPromises: Promise<void>[] = [];

    for (const packageName of packageNames) {
        const fetchPromise = fetchQueue.add(async () => {
            try {
                const distTags: unknown = await fetchPackageDistTags({ agent, token, packageName, registryUrl });
                const { latest } = distTags as Record<string, string | undefined>;
                if (!isString(latest)) {
                    throw new Error(`expected latest to be a string, but got ${latest}`);
                }
                packageNameToVersion.set(packageName, latest);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e.message || e);
            }
            cliProgress.update((packageNames.size - fetchQueue.size) / packageNames.size);
        });
        fetchPromises.push(fetchPromise);
    }
    await Promise.all(fetchPromises);
    cliProgress.done();
    return packageNameToVersion;
}
