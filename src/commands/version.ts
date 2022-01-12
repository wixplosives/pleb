import {
  resolveDirectoryContext,
  MultiPackageContext,
  childPackagesFromContext,
  SinglePackageContext,
} from '@wixc3/resolve-directory-context';
import { upgrade } from '../utils/workspace-upgrade.js';
import { versionSelector } from '../utils/version-selector.js';
import { type Modes, preProcessPackages } from '../utils/semver.js';

export interface VersionOptions {
  directoryPath: string;
  identifier: string;
  dryRun: boolean;
  mode: Modes;
}

export function version({ directoryPath, dryRun, mode, identifier }: VersionOptions) {
  const project = directoryPath;

  const releaseIdentifier = identifier;
  const directoryContext = resolveDirectoryContext(project);

  const packages = childPackagesFromContext(directoryContext);
  const rootPackage = getRootPackage(directoryContext);
  const packagesJson = packages.map(({ packageJson }) => packageJson);
  const ignoredPackages = new Set<number>();
  const { possibleVersions } = preProcessPackages({
    packagesJson,
    releaseIdentifier,
    ignoredPackages,
  });

  versionSelector({
    packages,
    possibleVersions,
    project,
    rootPackage,
    mode,
    onSelect(versionMap) {
      upgrade(project, versionMap, dryRun);
      process.exit(0); // TODO
    },
    onCancel() {
      process.exit(0); // TODO
    },
  });
}

//TODO: move to @wixc3/resolve-directory-context
function getRootPackage(directoryContext: SinglePackageContext | MultiPackageContext) {
  return directoryContext.type === 'single' ? directoryContext.npmPackage : directoryContext.rootPackage;
}
