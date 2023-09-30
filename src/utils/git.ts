import { spawnSync } from 'node:child_process';

export function currentGitCommitHash(cwd = process.cwd()): string | undefined {
  const { stdout, status } = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd });
  return status === 0 ? stdout.trim() : undefined;
}
