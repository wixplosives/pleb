import { spawn, SpawnOptions } from 'child_process';
import { once } from 'events';

export interface ISpawnAsyncOptions extends SpawnOptions {
  pipeStreams?: boolean;
}

export async function spawnAsync(
  command: string,
  args: ReadonlyArray<string> = [],
  options: ISpawnAsyncOptions = {}
): Promise<{
  output: string;
  exitCode: number;
}> {
  const childProcess = spawn(command, args, options);
  const output: Array<string | Buffer> = [];

  const captureOutput = output.push.bind(output);

  if (childProcess.stdout && childProcess.stderr) {
    childProcess.stdout.on('data', captureOutput);
    childProcess.stderr.on('data', captureOutput);

    if (options.pipeStreams) {
      childProcess.stdout.pipe(process.stdout);
      childProcess.stderr.pipe(process.stderr);
    }
  }

  const [exitCode] = (await once(childProcess, 'exit')) as [number | null];
  return { output: output.join(''), exitCode: exitCode || 0 };
}
