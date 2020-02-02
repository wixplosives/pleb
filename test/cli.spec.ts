import { join } from 'path';
import { expect } from 'chai';
import { spawnAsync } from './spawn-async';

const fixturesRoot = join(__dirname, 'fixtures');

const cliEntryPath = require.resolve('../src/cli.ts');

const runCli = async (cliArgs: string[] = []) =>
    spawnAsync('node', ['-r', '@ts-tools/node/r', cliEntryPath, ...cliArgs, '--dry'], {
        pipeStreams: true
    });

describe('cli', () => {
    describe('publish', () => {
        it('allows publishing new (not published) packages', async () => {
            const newPackagePath = join(fixturesRoot, 'new-package');

            const { output, exitCode } = await runCli(['publish', newPackagePath]);

            expect(output).to.include('lerna-publisher-new-package: package was never published.');
            expect(output).to.include('lerna-publisher-new-package: done.');
            expect(exitCode).to.equal(0);
        });

        it('avoids publishing already-published packages', async () => {
            const alreadyPublishedPackagePath = join(fixturesRoot, 'already-published');

            const { output, exitCode } = await runCli(['publish', alreadyPublishedPackagePath]);

            expect(output).to.include('lerna-publisher: 1.0.0 is already published. skipping');
            expect(exitCode).to.equal(0);
        });

        it('avoids publishing private packages', async () => {
            const privatePackagePath = join(fixturesRoot, 'private-package');

            const { output, exitCode } = await runCli(['publish', privatePackagePath]);

            expect(output).to.include('private-project: private. skipping');
            expect(exitCode).to.equal(0);
        });

        it('allows publishing a custom dist dir', async () => {
            const distDirFixturePath = join(fixturesRoot, 'dist-dir');

            const { output, exitCode } = await runCli(['publish', distDirFixturePath, '--distDir', 'npm']);

            expect(output).to.include('lerna-publisher-new-package: package was never published.');
            expect(output).to.include('total files:   2');
            expect(output).to.include('lerna-publisher-new-package: done.');
            expect(exitCode).to.equal(0);
        });
    });
});
