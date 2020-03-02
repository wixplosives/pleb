import fs from 'fs';
import { publishNpmPackage, overridePackageJsons } from '../utils/publish-npm-package';
import { resolveDirectoryContext, packagesFromResolvedContext } from '../utils/directory-context';
import { uriToIdentifier, officialNpmRegistryUrl } from '../utils/npm-registry';
import { loadNpmConfig } from '../utils/npm-config';
import { currentGitCommitHash } from '../utils/git';

export interface SnapshotOptions {
    directoryPath: string;
    dryRun?: boolean;
    contents: string;
}

export async function snapshot({ directoryPath, dryRun, contents }: SnapshotOptions): Promise<void> {
    const directoryContext = await resolveDirectoryContext(directoryPath);
    const packages = packagesFromResolvedContext(directoryContext);
    const commitHash = currentGitCommitHash();
    if (!commitHash) {
        throw new Error(`cannot determine git commit hash for ${directoryPath}`);
    }
    const npmConfig = loadNpmConfig();
    const registryKey = uriToIdentifier(officialNpmRegistryUrl);
    const token = npmConfig[`${registryKey}:_authToken`];
    const filesToRestore = await overridePackageJsons(packages, commitHash);
    const failedPublishes = new Set<string>();

    for (const npmPackage of packages) {
        try {
            await publishNpmPackage({
                tag: 'next',
                npmPackage,
                dryRun,
                distDir: contents,
                registry: officialNpmRegistryUrl,
                token
            });
        } catch {
            failedPublishes.add(npmPackage.packageJson.name);
        }
    }
    for (const [filePath, fileContents] of filesToRestore) {
        await fs.promises.writeFile(filePath, fileContents);
    }
    filesToRestore.clear();

    if (failedPublishes.size) {
        throw new Error(`some packages failed publishing: ${Array.from(failedPublishes).join(', ')}`);
    }
}
