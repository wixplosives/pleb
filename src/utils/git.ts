import { spawnSync } from 'child_process';

export function currentGitCommitHash(cwd = process.cwd()): string | undefined {
  const { stdout, status } = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd });
  return status === 0 ? stdout.trim() : undefined;
}

// TODO: use status === 0 pattern
export const getGitStatus = (cwd: string) => spawnSync('git status', { shell: true, encoding: 'utf-8', cwd }).stdout;

export const gitCommit = (cwd: string, message: string) =>
  spawnSync(`git commit -am ${JSON.stringify(message)}`, { shell: true, encoding: 'utf-8', cwd }).stdout;

export const gitPush = (cwd: string) => spawnSync(`git push --tags`, { shell: true, encoding: 'utf-8', cwd }).stdout;

export const gitTag = (cwd: string, version: string, packageName?: string) =>
  spawnSync(gitTagCommand(version, packageName), {
    shell: true,
    encoding: 'utf-8',
    cwd,
  }).stdout;

export const gitTagCommand = (version: string, packageName?: string) =>
  `git tag -a ${packageName ? `${packageName}@${version}` : `v${version}`}`;
