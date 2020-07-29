import { join } from 'path';
import { expect } from 'chai';
import { spawnAsync } from './spawn-async';

const fixturesRoot = join(__dirname, 'fixtures');

const cliEntryPath = require.resolve('../src/cli.ts');

const runCli = async (cliArgs: string[] = []) =>
  spawnAsync('node', ['-r', '@ts-tools/node/r', cliEntryPath, ...cliArgs, '--dry-run'], {
    pipeStreams: true,
  });

describe('cli', () => {
  describe('publish', () => {
    it('allows publishing new (not published) packages', async () => {
      const newPackagePath = join(fixturesRoot, 'new-package');

      const { output, exitCode } = await runCli(['publish', newPackagePath]);

      expect(output).to.include('pleb-new-package: package was never published.');
      expect(output).to.include('pleb-new-package: done.');
      expect(exitCode).to.equal(0);
    });

    it('avoids publishing already-published packages', async () => {
      const alreadyPublishedPackagePath = join(fixturesRoot, 'already-published');

      const { output, exitCode } = await runCli(['publish', alreadyPublishedPackagePath]);

      expect(output).to.include('pleb: 1.3.0 is already published. skipping');
      expect(exitCode).to.equal(0);
    });

    it('avoids publishing private packages', async () => {
      const privatePackagePath = join(fixturesRoot, 'private-package');

      const { output, exitCode } = await runCli(['publish', privatePackagePath]);

      expect(output).to.include('private-project: private. skipping');
      expect(exitCode).to.equal(0);
    });

    it('allows specifying a custom dist directory', async () => {
      const distDirFixturePath = join(fixturesRoot, 'dist-dir');

      const { output, exitCode } = await runCli(['publish', distDirFixturePath, '--contents', 'npm']);

      expect(output).to.include('pleb-new-package: package was never published.');
      expect(output).to.include('total files:   2');
      expect(output).to.include('pleb-new-package: done.');
      expect(exitCode).to.equal(0);
    });

    it('publishes workspace packages in correct order (deps first)', async () => {
      const distDirFixturePath = join(fixturesRoot, 'yarn-workspace');

      const { output, exitCode } = await runCli(['publish', distDirFixturePath]);

      expect(output).to.include('prepack b');
      expect(output).to.include('prepack a');
      expect(output).to.include('yarn-workspace-a: done.');
      expect(output).to.include('yarn-workspace-b: done.');
      expect(output.indexOf('prepack b')).to.be.lessThan(output.indexOf('prepack a'));
      expect(output.indexOf('prepack a')).to.be.lessThan(output.indexOf('yarn-workspace-b: done.'));
      expect(output.indexOf('yarn-workspace-b: done.')).to.be.lessThan(output.indexOf('yarn-workspace-a: done.'));
      expect(exitCode).to.equal(0);
    });

    it('publishes npm-style "file:" linked packages', async () => {
      const distDirFixturePath = join(fixturesRoot, 'npm-linked');

      const { output, exitCode } = await runCli(['publish', distDirFixturePath]);

      expect(output).to.include('npm-linked-a: done.');
      expect(output).to.include('npm-linked-b: done.');
      expect(output.indexOf('npm-linked-b: done.')).to.be.lessThan(output.indexOf('npm-linked-a: done.'));
      expect(exitCode).to.equal(0);
    });
  });
});
