import { spawnSync, SpawnSyncOptions } from 'child_process';
import { log, logError } from './log';

export function spawnSyncLogged(
    command: string,
    args: string[],
    options: SpawnSyncOptions,
    label = options.cwd || process.cwd()
) {
    log(`${label}: ${command} ${args.join(' ')}`);
    const { status } = spawnSync(command, args, options);
    if (status !== 0) {
        throw new Error(`non-zero exit code returned ${status}`);
    }
}

export function printErrorAndExit(message: unknown) {
    logError(message);
    process.exitCode = 1;
}
