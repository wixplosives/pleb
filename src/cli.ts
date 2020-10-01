/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import path from 'path';
import program from 'commander';
import { reportProcessError } from './utils/process';
import type { PackageJson } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version, description } = require('../package.json') as PackageJson;

process.on('unhandledRejection', reportProcessError);
process.on('uncaughtException', reportProcessError);

program
  .command('publish [target]')
  .description('publish unpublished packages')
  .option('--dry-run', 'no actual publishing (passed to npm as well)', false)
  .option('--contents <name>', 'subdirectory to publish (similar to lerna publish --contents)', '.')
  .option('--registry <url>', 'npm registry to use')
  .option('--tag <tag>', 'tag to use for published version', 'latest')
  .action(async (targetPath: string, { dryRun, contents, registry, tag }) => {
    try {
      const { publish } = await import('./commands/publish');

      await publish({
        directoryPath: path.resolve(targetPath || ''),
        dryRun,
        distDir: contents,
        registryUrl: registry,
        tag,
      });
    } catch (e) {
      reportProcessError(e);
    }
  });

program
  .command('upgrade [target]')
  .description('upgrade dependencies and devDependencies of all packages')
  .option('--dry-run', 'no actual upgrading (just the fetching process)', false)
  .option('--registry <url>', 'npm registry to use')
  .option('--tag <tag>', 'tag upgrade to', 'latest')
  .option('--prefix <prefix>', 'upgrade only packages that start with <prefix>')
  .action(async (targetPath: string, { dryRun, registry, tag, prefix }) => {
    try {
      const { upgrade } = await import('./commands/upgrade');

      await upgrade({
        directoryPath: path.resolve(targetPath || ''),
        dryRun,
        registryUrl: registry,
        tag,
        prefix,
      });
    } catch (e) {
      reportProcessError(e);
    }
  });

program.version(version!, '-v, --version').description(description!).usage('[options]').parse(process.argv);
