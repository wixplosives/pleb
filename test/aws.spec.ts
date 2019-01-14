import { expect } from 'chai'
import { join } from 'path'
import * as sinon from 'sinon'

const awsSdk = require('aws-sdk')
const aws = require('../src/aws.ts')
const fixturesRoot = join(__dirname, '..', 'fixtures')

describe('upload folder', () => {
    it('traverse folder strcuture properly', async () => {
        const path = join(fixturesRoot, 'proj_to_deploy', 'packages', 'pkg_to_deploy', 'dist-dir')
        const result = await aws.walkSync(path)
        expect(result.length).to.equal(2)
        console.log(result)
    }),
    it('run upload folder', async () => {
        const sandbox = sinon.createSandbox()
        const awss3fake = sinon.stub(awsSdk, 'S3')
        const fakeS3 = {
            putObject: async () => {
                return true
            }
        }
        awss3fake.returns(fakeS3)

        const path = join(fixturesRoot, 'proj_to_deploy/packages/pkg_to_deploy/dist-dir')
        process.env.AWS_ACCESS_KEY_ID = 'key'
        process.env.AWS_SECRET_ID = 'secret'
        process.env.AWS_BUCKET_NAME = 'demo.bucket.com'
        const result = await aws.uploadFolder(path, 'pkg_to_deploy', 'master')
        expect(result).to.equal(true)
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
