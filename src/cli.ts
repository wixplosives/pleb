/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import type { PackageJson } from 'type-fest';
import { reportProcessError } from './utils/process.js';

const packageJsonPath = new URL('../package.json', import.meta.url);
const { name, version, description } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;

process.on('unhandledRejection', reportProcessError);
process.on('uncaughtException', reportProcessError);

const program = new Command(name);
program
  .command('publish [target]')
  .description('publish unpublished packages')
  .option('--dry-run', 'no actual publishing (passed to npm as well)', false)
  .option('--contents <name>', 'subdirectory to publish (similar to lerna publish --contents)', '.')
  .option('--registry <url>', 'npm registry to use')
  .option('--tag <tag>', 'tag to use for published version', 'latest')
  .action(async (targetPath: string, { dryRun, contents, registry, tag }) => {
    const { publish } = await import('./commands/publish.js');

    await publish({
      directoryPath: path.resolve(targetPath || ''),
      dryRun,
      distDir: contents,
      registryUrl: registry,
      tag,
    });
  });

program
  .command('upgrade [target]')
  .description('upgrade dependencies and devDependencies of all packages')
  .option('--dry-run', 'no actual upgrading (just the fetching process)', false)
  .option('--registry <url>', 'npm registry to use')
  .option('-m, --match <regex>', 'upgrade only packages matching the given JS Regexp')
  .action(async (targetPath: string, { dryRun, registry, match }) => {
    const { upgrade } = await import('./commands/upgrade.js');
    const _match = match ? new RegExp(match) : undefined;

    await upgrade({
      directoryPath: path.resolve(targetPath || ''),
      dryRun,
      registryUrl: registry,
      match: _match,
    });
  });

program.version(version!, '-v, --version').description(description!).parseAsync().catch(reportProcessError);
