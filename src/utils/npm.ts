import { spawnSync } from 'child_process';

// TODO: use status === 0 pattern
export const updateLockFile = (cwd: string) =>
  spawnSync('npm install --package-lock-only', { shell: true, encoding: 'utf-8', cwd }).stdout;
