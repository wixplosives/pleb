import { spawnSync } from 'child_process';

export function currentGitCommitHash() {
    const { stdout, status } = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
    return status === 0 ? stdout.trim() : undefined;
}
