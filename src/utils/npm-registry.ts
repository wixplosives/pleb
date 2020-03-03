import url from 'url';
import http from 'http';
import https from 'https';
import pacote from 'pacote';
import PromiseQueue from 'p-queue';

import { log, logWarn } from './log';
import { createCliProgressBar } from './cli-progress-bar';
import { fetchText } from './http';
import { isString, isObject } from './language-helpers';

export const officialNpmRegistryUrl = 'https://registry.npmjs.org/';

// https://github.com/npm/cli/blob/v6.13.7/lib/config/nerf-dart.js
export function uriToIdentifier(uri: string) {
    const parsed = url.parse(uri);
    delete parsed.protocol;
    delete parsed.auth;
    delete parsed.query;
    delete parsed.search;
    delete parsed.hash;

    return url.resolve(url.format(parsed), '.');
}

export async function fetchPackageVersions(
    packageName: string,
    registryUrl: string,
    token?: string
): Promise<string[]> {
    try {
        log(`${packageName}: fetching versions...`);
        const packument = await pacote.packument(packageName, {
            registry: registryUrl,
            token
        });
        const versions = Object.keys(packument.versions);
        log(`${packageName}: got ${versions.length} published versions.`);
        return versions;
    } catch (error) {
        if (error?.statusCode === 404) {
            logWarn(`${packageName}: package was never published.`);
            return [];
        } else {
            throw error;
        }
    }
}

export interface IFetchLatestPackageVersionsOptions {
    packageNames: Set<string>;
    agent: http.Agent | https.Agent;
    token: string | undefined;
    registryUrl: string;
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
                const options: https.RequestOptions = { agent };
                if (token) {
                    options.headers = { authorization: `Bearer ${token}` };
                }
                const responseText = await fetchText(`${registryUrl}-/package/${packageName}/dist-tags`, options);
                const distTags: unknown = JSON.parse(responseText);
                if (!isObject(distTags)) {
                    throw new Error(`expected an object response, but got ${distTags}`);
                }
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
