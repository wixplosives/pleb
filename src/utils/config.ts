import { findFileUpSync, isPlainObject, isString } from '@wixc3/resolve-directory-context';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type SkipConfiguration = string | { name: string; reason?: string };

export interface Configuration {
  /**
   * A list of packages to avoid upgrading when executing `pleb upgrade`.
   * @example ['react', {name: 'execa', reason: 'native esm'}]
   */
  pinnedPackages?: SkipConfiguration[];
}

const possibleConfigNames = ['pleb.config.js', 'pleb.config.mjs', 'pleb.config.cjs'];

export async function loadPlebConfig(directoryPath: string): Promise<Configuration> {
  const host = { ...fs, ...path };
  for (const configName of possibleConfigNames) {
    const configFilePath = findFileUpSync(directoryPath, configName, host);
    if (configFilePath !== undefined) {
      const { default: configValue } = (await import(pathToFileURL(configFilePath).href)) as { default: unknown };
      if (!isPlainObject(configValue)) {
        throw new Error(`config file ${configFilePath} doesn't export a default object`);
      }
      return configValue as Configuration;
    }
  }
  return {};
}

/** key is package to skip; value is reason (which can be an empty string) */
export function normalizePinnedPackages(pinnedPackages: Configuration['pinnedPackages'] = []): Map<string, string> {
  return new Map(
    pinnedPackages.map((value) => {
      return isString(value) ? [value, ''] : [value.name, value.reason ?? ''];
    }),
  );
}
