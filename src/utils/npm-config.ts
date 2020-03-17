import fs from 'fs';
import path from 'path';
import os from 'os';
import findUp from 'find-up';
import { parseIni } from './ini';
import { fileExists } from './fs';

export interface LoadNpmConfigOptions {
    basePath?: string;
}

export async function loadEnvNpmConfig({ basePath }: LoadNpmConfigOptions = {}): Promise<Record<string, string>> {
    const config: Record<string, string> = {};
    const visitedConfigFilePaths = new Set<string>();

    const userNpmConfigPath = path.join(os.homedir(), '.npmrc');
    visitedConfigFilePaths.add(userNpmConfigPath);
    Object.assign(config, await loadNpmConfigFile(userNpmConfigPath));

    const { NPM_CONFIG_GLOBALCONFIG = process.env.NPM_CONFIG_GLOBALCONFIG } = config;
    if (NPM_CONFIG_GLOBALCONFIG !== undefined && !visitedConfigFilePaths.has(NPM_CONFIG_GLOBALCONFIG)) {
        visitedConfigFilePaths.add(NPM_CONFIG_GLOBALCONFIG);
        Object.assign(config, await loadNpmConfigFile(NPM_CONFIG_GLOBALCONFIG));
    }

    const { NPM_CONFIG_USERCONFIG = process.env.NPM_CONFIG_USERCONFIG } = config;
    if (NPM_CONFIG_USERCONFIG !== undefined && !visitedConfigFilePaths.has(NPM_CONFIG_USERCONFIG)) {
        visitedConfigFilePaths.add(NPM_CONFIG_USERCONFIG);
        Object.assign(config, await loadNpmConfigFile(NPM_CONFIG_USERCONFIG));
    }

    const projectNpmConfigPath = await findUp('.npmrc', { cwd: basePath });
    if (projectNpmConfigPath !== undefined && !visitedConfigFilePaths.has(projectNpmConfigPath)) {
        visitedConfigFilePaths.add(projectNpmConfigPath);
        Object.assign(config, await loadNpmConfigFile(projectNpmConfigPath));
    }

    // replace referenced env variables with actual values
    for (const [key, value] of Object.entries(config)) {
        config[key] = replaceEnvVarReferences(value);
    }
    return config;
}

export async function loadNpmConfigFile(configFilePath: string): Promise<Record<string, string> | undefined> {
    return (await fileExists(configFilePath))
        ? parseIni(await fs.promises.readFile(configFilePath, 'utf8'))
        : undefined;
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
