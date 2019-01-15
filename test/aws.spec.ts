import { expect } from 'chai'
import { join } from 'path'
import * as sinon from 'sinon'
import AWS from 'aws-sdk'
const aws = require('../src/aws.ts')

const fixturesRoot = join(__dirname, '..', 'fixtures')

class FakeAwsS3 {
    public called: boolean = false

    public putObject() {
        return {
            promise: () => {
                this.called = true
                Promise.resolve(true)
            }
        }
    }
}

describe('upload folder', () => {
    it('traverse folder strcuture properly', async () => {
        const path = join(fixturesRoot, 'proj_to_deploy', 'packages', 'pkg_to_deploy', 'dist-dir')
        const result = await aws.walkSync(path)
        expect(result.length).to.equal(2)
        console.log(result)
    }),
    it('run upload folder success', async () => {
        const sandbox = sinon.createSandbox()
        const awss3fake = sandbox.stub(AWS, 'S3')
        const fakeS3 = new FakeAwsS3()
        awss3fake.returns(fakeS3)

        const path = join(fixturesRoot, 'proj_to_deploy/packages/pkg_to_deploy/dist-dir')
        process.env.AWS_ACCESS_KEY_ID = 'key'
        process.env.AWS_SECRET_ID = 'secret'
        process.env.AWS_BUCKET_NAME = 'demo.bucket.com'
        const result = await aws.uploadFolder(path, 'pkg_to_deploy22', 'master')
        expect(result).to.equal(true)
        expect(fakeS3.called).to.equal(true)
        sandbox.restore()
    }),
    it('run upload folder failure', async () => {
        const sandbox = sinon.createSandbox()
        const awss3fake = sandbox.stub(AWS, 'S3')
        const fakeS3 = new FakeAwsS3()
        awss3fake.returns(fakeS3)

        const path = join(fixturesRoot, 'no/such/dir')
        process.env.AWS_ACCESS_KEY_ID = 'key'
        process.env.AWS_SECRET_ID = 'secret'
        process.env.AWS_BUCKET_NAME = 'demo.bucket.com'
        const result = await aws.uploadFolder(path, 'pkg_to_deploy22', 'master')
        expect(result).to.equal(false)
        expect(fakeS3.called).to.equal(false)
        sandbox.restore()
    })
    xit('upload fixtures', async () => {
        const path = join(fixturesRoot, 'proj_to_deploy/packages/pkg_to_deploy/dist')
        process.env.AWS_ACCESS_KEY_ID = 'key'
        process.env.AWS_SECRET_ID = 'secret+w'
        process.env.AWS_BUCKET_NAME = 'demo.bucket.com'
        const result = await aws.uploadFolder(path, 'pkg_to_deploy', 'master')
        expect(result).to.equal(true)
        console.log('log')
    })
})
