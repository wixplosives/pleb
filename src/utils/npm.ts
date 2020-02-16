import fs from 'fs';
import path from 'path';
import url from 'url';
import os from 'os';
import pacote from 'pacote';
import { parseIni } from './ini';
import { log, logWarn } from './log';

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
