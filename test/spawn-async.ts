import { spawn, type SpawnOptions } from 'node:child_process';
import { once } from 'node:events';

export interface ISpawnAsyncOptions extends SpawnOptions {
  pipeStreams?: boolean;
}

export async function spawnAsync(command: string, args: readonly string[] = [], options: ISpawnAsyncOptions = {}) {
  const childProcess = spawn(command, args, options);
  let output = '';

  childProcess.stdout?.setEncoding('utf8');
  childProcess.stderr?.setEncoding('utf8');

  const captureOutput = (chunk: string) => {
    output += chunk;
  };
  childProcess.stdout?.on('data', captureOutput);
  childProcess.stderr?.on('data', captureOutput);

  if (options.pipeStreams) {
    childProcess.stdout?.pipe(process.stdout);
    childProcess.stderr?.pipe(process.stderr);
  }

  const [exitCode] = (await once(childProcess, 'exit')) as [number];
  return { exitCode, output };
}
