import { spawnSync } from 'child_process';

export function currentGitCommitHash(cwd = process.cwd()) {
  const { stdout, status } = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd });
  return status === 0 ? stdout.trim() : undefined;
}
