import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from 'node:child_process';
import { log, logError } from './log.js';

export const spawnSyncSafe = ((...args: Parameters<typeof spawnSync>) => {
  const spawnResult = spawnSync(...args);
  if (spawnResult.status !== 0) {
    throw new Error(
      `Command "${args.filter((arg) => typeof arg === 'string').join(' ')}" failed with exit code ${String(
        spawnResult.status,
      )}.`,
    );
  }
  return spawnResult;
}) as typeof spawnSync;

export function spawnSyncLogged(
  command: string,
  args: string[],
  options: SpawnSyncOptions,
  label = options.cwd || process.cwd(),
): SpawnSyncReturns<string | Buffer> {
  log(`${label.toString()}: ${command} ${args.join(' ')}`);
  return spawnSyncSafe(command, args, options);
}

export function reportProcessError(message: unknown): void {
  logError(message);
  process.exitCode = 1;
}
