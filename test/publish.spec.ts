import { expect } from 'chai';
import { join } from 'path';
import sinon from 'sinon';
import childProcess from 'child_process';
const pacote = require('pacote');

import { publish } from '../src/publish';

const fixturesRoot = join(__dirname, '..', 'fixtures');

describe('publish', () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it('run publish if version wont match', async () => {
        const packoteManifestMock = sandbox.stub(pacote, 'packument');
        packoteManifestMock.callsFake(function fake(): {} {
            return { versions: { '0.0.1': { name: 'foo', version: '0.0.1' } } };
        });

        const execSyncMock = sandbox.stub(childProcess, 'execSync');
        execSyncMock.callsFake(function fake(...args: []): any {
            return args.length === 0;
        });

        const path = join(fixturesRoot, 'proj1');
        await publish(path);
        expect(execSyncMock.called).to.equal(true);
    });

    it('dont run publish if already published', async () => {
        const packoteManifestMock = sandbox.stub(pacote, 'packument');
        packoteManifestMock.callsFake(function fake(): {} {
            return { versions: { '1.0.0': { name: 'foo', version: '1.0.0' } } };
        });

        const execSyncMock = sandbox.stub(childProcess, 'execSync');
        execSyncMock.callsFake(function fake(...args: []): any {
            return args.length === 0;
        });

        const path = join(fixturesRoot, 'proj1');
        await publish(path);
        expect(execSyncMock.called).to.equal(false);
    });

    it('publish if pacakge was never published', async () => {
        const packoteManifestMock = sandbox.stub(pacote, 'packument');
        packoteManifestMock.callsFake(function fake(): {} {
            throw Error('No such pacakge');
        });

        const execSyncMock = sandbox.stub(childProcess, 'execSync');
        execSyncMock.callsFake(function fake(...args: []): any {
            return args.length === 0;
        });

        const path = join(fixturesRoot, 'proj1');
        await publish(path);
        expect(execSyncMock.called).to.equal(true);
    });
});
