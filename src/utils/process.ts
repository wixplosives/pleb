import { spawnSync, SpawnSyncOptions } from 'child_process';
import { log, logError } from './log';
import { isString } from './language-helpers';

export const spawnSyncSafe = ((...args: Parameters<typeof spawnSync>) => {
    const spawnResult = spawnSync(...args);
    if (spawnResult.status !== 0) {
        throw new Error(`Non-zero exit code returned ${status} when executing: ${args.filter(isString).join(' ')}`);
    }
    return spawnResult;
}) as typeof spawnSync;

export function spawnSyncLogged(
    command: string,
    args: string[],
    options: SpawnSyncOptions,
    label = options.cwd || process.cwd()
) {
    log(`${label}: ${command} ${args.join(' ')}`);
    return spawnSyncSafe(command, args, options);
}

export function printErrorAndExit(message: unknown) {
    logError(message);
    process.exitCode = 1;
}
