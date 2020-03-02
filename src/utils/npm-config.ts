import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseIni } from './ini';

export function loadNpmConfig(): Record<string, string> {
    const configPath = path.join(os.homedir(), '.npmrc');
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
