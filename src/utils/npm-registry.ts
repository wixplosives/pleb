import url from 'url';
import http from 'http';
import https from 'https';
import { URL } from 'url';

import { log, logWarn } from './log';
import { fetchText } from './http';
import { isObject } from './language-helpers';

export const officialNpmRegistryUrl = 'https://registry.npmjs.org/';

export interface FetchPackageDistTagsOptions {
    packageName: string;
    registryUrl: string;
    token?: string | undefined;
    agent?: http.Agent | https.Agent;
}

export interface NpmRegistryDistTags {
    latest: string;
    [tag: string]: string | undefined;
}

export async function fetchPackageDistTags({ agent, token, packageName, registryUrl }: FetchPackageDistTagsOptions) {
    const options: https.RequestOptions = { agent };
    if (token) {
        options.headers = { authorization: `Bearer ${token}` };
    }
    const responseText = await fetchText(createDistTagsURL(registryUrl, packageName), options);
    const distTags: unknown = JSON.parse(responseText);
    if (!isObject(distTags)) {
        throw new Error(`expected an object response, but got ${distTags}`);
    }

    return distTags as NpmRegistryDistTags;
}

export async function fetchPackageVersions(
    packageName: string,
    registryUrl: string,
    token?: string,
    agent?: http.Agent | https.Agent
): Promise<string[]> {
    try {
        log(`${packageName}: fetching versions...`);
        const options: https.RequestOptions = { agent };
        if (token) {
            options.headers = { authorization: `Bearer ${token}` };
        }
        const responseText = await fetchText(createPackumentURL(registryUrl, packageName), options);

        try {
            const packument: { versions: Record<string, string> } = JSON.parse(responseText);
            if (!isObject(packument)) {
                throw new Error(`expected an object response, but got ${packument}`);
            }
            if (!isObject(packument.versions)) {
                throw new Error(`expected "versions" to be an object, but got ${packument.versions}`);
            }
            const versions = Object.keys(packument.versions);
            log(`${packageName}: got ${versions.length} published versions.`);
            return versions;
        } catch (parseError) {
            throw new Error(`${parseError?.stack ?? parseError}\nResponse is:\n${responseText}`);
        }
    } catch (error) {
        if (error?.statusCode === 404) {
            logWarn(`${packageName}: package was never published.`);
            return [];
        } else {
            throw error;
        }
    }
}

export function createDistTagsURL(registryUrl: string, packageName: string): URL {
    return new URL(`-/package/${packageName}/dist-tags`, registryUrl);
}

export function createPackumentURL(registryUrl: string, packageName: string): string | URL {
    return new URL(packageName, registryUrl);
}

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
