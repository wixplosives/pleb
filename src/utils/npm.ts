import fs from 'fs';
import path from 'path';
import url from 'url';
import os from 'os';
import https from 'https';
import pacote from 'pacote';
import PromiseQueue from 'p-queue';
import { parseIni } from './ini';
import { log, logWarn } from './log';
import { createCliProgressBar } from './cli-progress-bar';
import { fetchText } from './http';

export const officialNpmRegistry = `https://registry.npmjs.org/`;

export function loadNpmConfig(configPath = path.join(os.homedir(), '.npmrc')): Record<string, string> {
    if (!fs.existsSync(configPath)) {
        return {};
    }
    const configText = fs.readFileSync(configPath, 'utf8');
    const config = parseIni(configText);

    for (const [key, value] of Object.entries(config)) {
        config[key] = replaceEnvVarReferences(value);
    }
    return config;
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
const envExpression = /(\\*)\$\{([^}]+)\}/g;
function replaceEnvVarReferences(value: string) {
    return value.replace(envExpression, (orig, esc, envKey) => {
        if (esc.length && esc.length % 2) {
            return orig;
        }
        const envVarValue = process.env[envKey];
        if (envVarValue === undefined) {
            throw Error(`Environment variable "${envKey}" is referenced, but isn't set.`);
        }
        return envVarValue;
    });
}

export async function fetchPackageVersions(packageName: string, registry: string, token?: string): Promise<string[]> {
    try {
        log(`${packageName}: fetching versions...`);
        const packument = await pacote.packument(packageName, {
            registry,
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

export async function fetchLatestPackageVersions(
    packageNames: Set<string>,
    agent: https.Agent,
    token: string | undefined,
    registryUrl: string
): Promise<Map<string, string>> {
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
                if (typeof distTags !== 'object' || distTags === null) {
                    throw new Error(`expected an object response, but got ${distTags}`);
                }
                const { latest } = distTags as Record<string, string | undefined>;
                if (typeof latest !== 'string') {
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
