import fs from 'fs';
import { publishNpmPackage, overridePackageJsons } from '../utils/publish-npm-package';
import { resolvePackages } from '../utils/packages';
import { loadNpmConfig, uriToIdentifier, officialNpmRegistry } from '../utils/npm';
import { currentGitCommitHash } from '../utils/git';

export interface SnapshotOptions {
    directoryPath: string;
    dryRun?: boolean;
    contents: string;
}

export async function snapshot({ directoryPath, dryRun, contents }: SnapshotOptions) {
    const packages = await resolvePackages(directoryPath);
    const commitHash = currentGitCommitHash();
    if (!commitHash) {
        throw new Error(`cannot determine git commit hash for ${directoryPath}`);
    }
    const npmConfig = loadNpmConfig();
    const registryKey = uriToIdentifier(officialNpmRegistry);
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
                registry: officialNpmRegistry,
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
