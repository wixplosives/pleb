import { expect } from 'chai';
import { join } from 'path';
import sinon from 'sinon';
import childProcess from 'child_process';
import pacote from 'pacote';

import { publish } from '../src/publish';

const fixturesRoot = join(__dirname, '..', 'fixtures');

describe('publish', () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it('run publish if version wont match', async () => {
        const packoteManifestMock = sandbox.stub(pacote, 'packument');
        packoteManifestMock.callsFake(() => {
            return Promise.resolve({
                name: 'foo',
                'dist-tags': { latest: '0.1.1' },
                versions: { '0.0.1': { name: 'foo', version: '0.0.1' } as pacote.PackageVersion }
            });
        });

        const execSyncMock = sandbox.stub(childProcess, 'execSync');
        execSyncMock.callsFake(() => {
            return Buffer.from(``);
        });

        const path = join(fixturesRoot, 'proj1');
        await publish(path);
        expect(execSyncMock.called).to.equal(true);
    });

    it('dont run publish if already published', async () => {
        const packoteManifestMock = sandbox.stub(pacote, 'packument');
        packoteManifestMock.callsFake(() => {
            return Promise.resolve({
                name: 'foo',
                'dist-tags': { latest: '1.0.0' },
                versions: { '1.0.0': { name: 'foo', version: '1.0.0' } as pacote.PackageVersion }
            });
        });

        const execSyncMock = sandbox.stub(childProcess, 'execSync');
        execSyncMock.callsFake(() => {
            return Buffer.from(``);
        });

        const path = join(fixturesRoot, 'proj1');
        await publish(path);
        expect(execSyncMock.called).to.equal(false);
    });

    it('publish if package was never published', async () => {
        const packoteManifestMock = sandbox.stub(pacote, 'packument');
        packoteManifestMock.callsFake(() => {
            const error = new Error('No such package');
            (error as Error & { statusCode: number }).statusCode = 404;
            throw error;
        });

        const execSyncMock = sandbox.stub(childProcess, 'execSync');
        execSyncMock.callsFake(command => {
            return Buffer.from(command);
        });

        const path = join(fixturesRoot, 'proj1');
        await publish(path);
        expect(execSyncMock.called).to.equal(true);
    });
});
