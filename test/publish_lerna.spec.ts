import { expect } from 'chai'
import { join } from 'path'
import * as sinon from 'sinon'
const childProcess = require( 'child_process' )

const pacote = require('pacote')

const publishLerna = require('../src/publish_lerna.ts')

const fixturesRoot = join(__dirname, '..', 'fixtures')

describe('publish lerna', () => {
    it('run publish if version wont match', async () => {
        const sandbox = sinon.createSandbox()

        const packoteManifestMock = sandbox.stub(pacote, 'packument')
        packoteManifestMock.callsFake(function fake(): {} {
            return { versions : {'0.0.1' : { name : 'foo', version: '0.0.1' }}}
        })

        const execSyncMock = sandbox.stub(childProcess, 'execSync')
        execSyncMock.callsFake(function fake( ...args: []): any {
           return ( args.length === 0 )
        })

        const path = join(fixturesRoot, 'proj1')
        const result = await publishLerna.CheckAndPublishMonorepo(path)
        expect(execSyncMock.called).to.equal(true)
        expect(result).to.equal(true)
        sandbox.restore()
    })

    it('dont run publish if already published', async () => {
        const sandbox = sinon.createSandbox()

        const packoteManifestMock = sandbox.stub(pacote, 'packument')
        packoteManifestMock.callsFake(function fake(): {} {
            return { versions : {'1.0.0' : { name : 'foo', version: '1.0.0' }}}
        })

        const execSyncMock = sandbox.stub(childProcess, 'execSync')
        execSyncMock.callsFake(function fake( ...args: []): any {
           return ( args.length === 0 )
        })

        const path = join(fixturesRoot, 'proj1')
        const result = await publishLerna.CheckAndPublishMonorepo(path)
        expect(execSyncMock.called).to.equal(false)
        expect(result).to.equal(true)
        sandbox.restore()
    })

    it('publish if pacakge was never published', async () => {
        const sandbox = sinon.createSandbox()

        const packoteManifestMock = sandbox.stub(pacote, 'packument')
        packoteManifestMock.callsFake(function fake(): {} {
            throw Error( 'No such pacakge')
        })

        const execSyncMock = sandbox.stub(childProcess, 'execSync')
        execSyncMock.callsFake(function fake( ...args: []): any {
           return ( args.length === 0 )
        })

        const path = join(fixturesRoot, 'proj1')
        const result = await publishLerna.CheckAndPublishMonorepo(path)
        expect(execSyncMock.called).to.equal(true)
        expect(result).to.equal(true)
        sandbox.restore()
    })
})
