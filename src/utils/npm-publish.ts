import { type INpmPackage } from '@wixc3/resolve-directory-context';
import { retry } from 'promise-assist';
import { log, logWarn } from './log.js';
import type { NpmRegistry } from './npm-registry.js';

export async function getPackagesToPublish(packages: INpmPackage[], registry: NpmRegistry): Promise<INpmPackage[]> {
  const packagesToPublish: INpmPackage[] = [];
  for (const npmPackage of packages) {
    const { displayName, packageJson } = npmPackage;
    const { name: packageName, version: packageVersion } = packageJson;
    if (typeof packageName !== 'string') {
      logWarn(`${displayName}: no package name. skipping.`);
      continue;
    }
    if (packageJson.private) {
      logWarn(`${packageName}: private. skipping.`);
      continue;
    }
    if (typeof packageVersion !== 'string') {
      logWarn(`${packageName}: invalid version field. skipping.`);
      continue;
    }
    log(`${packageName}: fetching versions...`);
    const versions = await retry(() => registry.fetchVersions(packageName), {
      delay: 1000,
      retries: 3,
    });

    log(`${packageName}: got ${versions.length} published versions.`);
    if (!versions.length) {
      logWarn(`${packageName}: package was never published.`);
      packagesToPublish.push(npmPackage);
    } else if (!versions.includes(packageVersion)) {
      logWarn(`${packageName}: ${packageVersion} was never published.`);
      packagesToPublish.push(npmPackage);
    } else {
      logWarn(`${packageName}: ${packageVersion} is already published. skipping.`);
    }
  }
  return packagesToPublish;
}
