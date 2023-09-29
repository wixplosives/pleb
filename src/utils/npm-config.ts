import { findFileUpSync } from '@wixc3/resolve-directory-context';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileExists } from './fs.js';
import { parseIni } from './ini.js';

export interface LoadNpmConfigOptions {
  basePath?: string;
}

export async function loadEnvNpmConfig({ basePath = process.cwd() }: LoadNpmConfigOptions = {}): Promise<
  Record<string, string | undefined>
> {
  const config: Record<string, string> = {};
  const configFilePaths = new Set<string | undefined>();

  configFilePaths.add(path.join(os.homedir(), '.npmrc'));
  configFilePaths.add(process.env['NPM_CONFIG_GLOBALCONFIG']);
  configFilePaths.add(process.env['NPM_CONFIG_USERCONFIG']);
  configFilePaths.add(findFileUpSync(basePath, '.npmrc', { ...fs, ...path }));

  for (const configFilePath of configFilePaths) {
    if (typeof configFilePath === 'string') {
      Object.assign(config, await loadNpmConfigFile(configFilePath));
    }
  }

  // replace referenced env variables with actual values
  for (const [key, value] of Object.entries(config)) {
    config[key] = replaceEnvVarReferences(value);
  }
  return config;
}

export async function loadNpmConfigFile(configFilePath: string): Promise<Record<string, string> | undefined> {
  return (await fileExists(configFilePath)) ? parseIni(await fs.promises.readFile(configFilePath, 'utf8')) : undefined;
}

const envExpression = /(\\*)\$\{([^}]+)\}/g;
function replaceEnvVarReferences(value: string) {
  return value.replace(envExpression, (orig, esc: unknown[], envKey: string) => {
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
