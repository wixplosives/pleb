import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnAsync } from './spawn-async.js';

const fixturesRoot = fileURLToPath(new URL('../../test/fixtures', import.meta.url));
const cliEntryPath = fileURLToPath(new URL('../../bin/pleb.js', import.meta.url));

const runCli = async (cliArgs: string[] = []) =>
  spawnAsync('node', [cliEntryPath, ...cliArgs, '--dry-run'], {
    pipeStreams: true,
  });

describe('pleb publish', function () {
  this.timeout(30_000);

  it('allows publishing new (not published) packages', async () => {
    const newPackagePath = join(fixturesRoot, 'new-package');

    const { output, exitCode } = await runCli(['publish', newPackagePath]);

    assert.match(output, /pleb-new-package: package was never published./);
    assert.match(output, /pleb-new-package: done./);
    assert.equal(exitCode, 0);
  });

  it('avoids publishing already-published packages', async () => {
    const alreadyPublishedPackagePath = join(fixturesRoot, 'already-published');

    const { output, exitCode } = await runCli(['publish', alreadyPublishedPackagePath]);

    assert.match(output, /pleb: 1.3.0 is already published. skipping/);
    assert.equal(exitCode, 0);
  });

  it('avoids publishing private packages', async () => {
    const privatePackagePath = join(fixturesRoot, 'private-package');

    const { output, exitCode } = await runCli(['publish', privatePackagePath]);

    assert.match(output, /private-project: private. skipping/);
    assert.equal(exitCode, 0);
  });

  it('allows specifying a custom dist directory', async () => {
    const distDirFixturePath = join(fixturesRoot, 'dist-dir');

    const { output, exitCode } = await runCli(['publish', distDirFixturePath, '--contents', 'npm']);

    assert.match(output, /pleb-new-package: package was never published./);
    assert.match(output, /total files:\s+2/);
    assert.match(output, /pleb-new-package: done./);
    assert.equal(exitCode, 0);
  });

  it('publishes workspace packages in correct order (deps first)', async () => {
    const distDirFixturePath = join(fixturesRoot, 'yarn-workspace');

    const { output, exitCode } = await runCli(['publish', distDirFixturePath]);

    assert.match(output, /prepack yarn-workspace-b/);
    assert.match(output, /prepack yarn-workspace-a/);
    assert.match(output, /yarn-workspace-a: done./);
    assert.match(output, /yarn-workspace-b: done./);
    assert.ok(output.indexOf('prepack yarn-workspace-b') < output.indexOf('prepack yarn-workspace-a'));
    assert.ok(output.indexOf('prepack yarn-workspace-a') < output.indexOf('yarn-workspace-b: done.'));
    assert.ok(output.indexOf('yarn-workspace-b: done.') < output.indexOf('yarn-workspace-a: done.'));
    assert.equal(exitCode, 0);
  });

  it('publishes npm-style "file:" linked packages', async () => {
    const distDirFixturePath = join(fixturesRoot, 'npm-linked');

    const { output, exitCode } = await runCli(['publish', distDirFixturePath]);

    assert.match(output, /npm-linked-a: done./);
    assert.match(output, /npm-linked-b: done./);
    assert.ok(output.indexOf('npm-linked-b: done.') < output.indexOf('npm-linked-a: done.'));
    assert.equal(exitCode, 0);
  });

  it('publishes lerna workspaces', async () => {
    const distDirFixturePath = join(fixturesRoot, 'lerna-workspace');

    const { output, exitCode } = await runCli(['publish', distDirFixturePath]);

    assert.match(output, /lerna-workspace-a: done./);
    assert.match(output, /lerna-workspace-b: done./);
    assert.ok(output.indexOf('lerna-workspace-b: done.') < output.indexOf('lerna-workspace-a: done.'));
    assert.equal(exitCode, 0);
  });
});
