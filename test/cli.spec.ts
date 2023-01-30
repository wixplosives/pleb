import { join } from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai';
import { spawnAsync } from './spawn-async.js';
import { upgrade } from 'pleb';

const fixturesRoot = fileURLToPath(new URL('../../test/fixtures', import.meta.url));
const cliEntryPath = fileURLToPath(new URL('../../bin/pleb.js', import.meta.url));

const runCli = async (cliArgs: string[] = []) =>
  spawnAsync('node', [cliEntryPath, ...cliArgs, '--dry-run'], {
    pipeStreams: true,
  });

describe('cli', function () {
  this.timeout(30_000);

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

      expect(output).to.include('prepack yarn-workspace-b');
      expect(output).to.include('prepack yarn-workspace-a');
      expect(output).to.include('yarn-workspace-a: done.');
      expect(output).to.include('yarn-workspace-b: done.');
      expect(output.indexOf('prepack yarn-workspace-b')).to.be.lessThan(output.indexOf('prepack yarn-workspace-a'));
      expect(output.indexOf('prepack yarn-workspace-a')).to.be.lessThan(output.indexOf('yarn-workspace-b: done.'));
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

    it('publishes lerna workspaces', async () => {
      const distDirFixturePath = join(fixturesRoot, 'lerna-workspace');

      const { output, exitCode } = await runCli(['publish', distDirFixturePath]);

      expect(output).to.include('lerna-workspace-a: done.');
      expect(output).to.include('lerna-workspace-b: done.');
      expect(output.indexOf('lerna-workspace-b: done.')).to.be.lessThan(output.indexOf('lerna-workspace-a: done.'));
      expect(exitCode).to.equal(0);
    });
  });

  describe('upgrade', () => {
    function createMockRegistry(packagesData: Record<string, { latest: string; [tag: string]: string | undefined }>) {
      return {
        async fetchDistTags(packageName: string) {
          return Promise.resolve(packagesData[packageName]!);
        },
        dispose() {
          /**/
        },
      };
    }
    function createMockOutput() {
      const output: { type: 'log' | 'error'; message: unknown }[] = [];
      return {
        output,
        log(this: void, message: unknown) {
          output.push({ type: 'log', message });
        },
        logError(this: void, message: unknown) {
          output.push({ type: 'error', message });
        },
      };
    }
    it('should report nothing to upgrade for an empty project', async () => {
      const newPackagePath = join(fixturesRoot, 'new-package');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () => createMockRegistry({}),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 0 dependencies...' },
        { type: 'log', message: 'Nothing to upgrade.' },
      ]);
    });
    it('should report nothing to upgrade when everything is up to date', async () => {
      const newPackagePath = join(fixturesRoot, 'dependencies');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () =>
          createMockRegistry({
            'package-a': { latest: '1.0.0' },
            'package-b': { latest: '1.0.0' },
            'package-c': { latest: '1.0.0' },
          }),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 3 dependencies...' },
        { type: 'log', message: 'Nothing to upgrade.' },
      ]);
    });
    it('should report on dependencies with newer versions', async () => {
      const newPackagePath = join(fixturesRoot, 'dependencies');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () =>
          createMockRegistry({
            'package-a': { latest: '1.0.0' },
            'package-b': { latest: '2.0.0' },
            'package-c': { latest: '2.0.0' },
          }),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 3 dependencies...' },
        { type: 'log', message: 'Changes:' },
        { type: 'log', message: '  package-b     ~1.0.0 -> ~2.0.0' },
        { type: 'log', message: '  package-c     ^1.0.0 -> ^2.0.0' },
      ]);
    });
    it('should force exact version to caret (opinionated)', async () => {
      const newPackagePath = join(fixturesRoot, 'dependencies-exact');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () =>
          createMockRegistry({
            'package-a': { latest: '1.0.0' },
          }),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 1 dependencies...' },
        { type: 'log', message: 'Changes:' },
        { type: 'log', message: '  package-a      1.0.0 -> ^1.0.0' },
      ]);
    });
    it('should not update file reference', async () => {
      const newPackagePath = join(fixturesRoot, 'dependencies-file-ref');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () =>
          createMockRegistry({
            'package-a': { latest: '2.0.0' },
            'package-b': { latest: '1.0.0' },
          }),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 1 dependencies...' },
        { type: 'log', message: 'Nothing to upgrade.' },
      ]);
    });
    it('should report from multiple yarn workspaces (only on external packages)', async () => {
      const newPackagePath = join(fixturesRoot, 'yarn-workspace');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () =>
          createMockRegistry({
            'yarn-workspace-b': { latest: '2.0.0' },
            'external-a': { latest: '2.0.0' },
            'external-b': { latest: '2.0.0' },
          }),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 2 dependencies...' },
        { type: 'log', message: 'Changes:' },
        { type: 'log', message: '  external-b     ^1.0.0 -> ^2.0.0' },
        { type: 'log', message: '  external-a     ^1.0.0 -> ^2.0.0' },
      ]);
    });
    it('should report from multiple lerna workspaces (only on external packages)', async () => {
      const newPackagePath = join(fixturesRoot, 'lerna-workspace');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () =>
          createMockRegistry({
            'lerna-workspace-b': { latest: '2.0.0' },
            'external-a': { latest: '2.0.0' },
            'external-b': { latest: '2.0.0' },
          }),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 2 dependencies...' },
        { type: 'log', message: 'Changes:' },
        { type: 'log', message: '  external-b     ^1.0.0 -> ^2.0.0' },
        { type: 'log', message: '  external-a     ^1.0.0 -> ^2.0.0' },
      ]);
    });
    it('should skip pinned packages', async () => {
      const newPackagePath = join(fixturesRoot, 'dependencies-pinned');
      const { log, logError, output } = createMockOutput();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await upgrade({
        dryRun: true,
        directoryPath: newPackagePath,
        registryUrl: '',
        createRegistry: () =>
          createMockRegistry({
            'package-a': { latest: '2.0.0' },
            'package-b': { latest: '2.0.0' },
          }),
        log,
        logError,
      });

      expect(output).to.eql([
        { type: 'log', message: 'Getting "latest" version for 2 dependencies...' },
        { type: 'log', message: 'Changes:' },
        { type: 'log', message: '  package-a     ~1.0.0 -> ~2.0.0' },
        { type: 'log', message: 'Skipped:' },
        { type: 'log', message: '  package-b     ~1.0.0 -> ~2.0.0 (broken stuff)' },
      ]);
    });
  });
});
