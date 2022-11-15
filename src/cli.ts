/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
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
  .action(async (targetPath: string, { dryRun, registry }) => {
    const { upgrade } = await import('./commands/upgrade.js');

    await upgrade({
      directoryPath: path.resolve(targetPath || ''),
      dryRun,
      registryUrl: registry,
    });
  });

program.version(version!, '-v, --version').description(description!).parseAsync().catch(reportProcessError);
