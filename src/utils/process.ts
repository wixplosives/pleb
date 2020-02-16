import { spawnSync, SpawnSyncOptions } from 'child_process';
import { log, logError } from './log';

export function spawnSyncLogged(
    command: string,
    args: string[],
    options: SpawnSyncOptions,
    label = options.cwd || process.cwd()
) {
    log(`${label}: ${command} ${args.join(' ')}`);
    return spawnSync(command, args, options);
}

export function printErrorAndExit(message: unknown) {
    logError(message);
    process.exit(1);
}
