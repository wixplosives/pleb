import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { join } from 'path';
import sinon from 'sinon';
import AWS from 'aws-sdk';
import * as aws from '../src/aws';

const fixturesRoot = join(__dirname, '..', 'fixtures');

chai.use(chaiAsPromised);

class FakeAwsS3 {
    public called: boolean = false;

    public putObject() {
        return {
            promise: () => {
                this.called = true;
                Promise.resolve(true);
            }
        };
    }
}

describe('upload folder', () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    beforeEach(() => {
        process.env.AWS_ACCESS_KEY_ID = 'key';
        process.env.AWS_SECRET_ID = 'secret';
        process.env.AWS_BUCKET_NAME = 'demo.bucket.com';
    });

    it('run upload folder success', async () => {
        const awss3fake = sandbox.stub(AWS, 'S3');
        const fakeS3 = new FakeAwsS3();

        awss3fake.returns(fakeS3);

        const path = join(fixturesRoot, 'proj_to_deploy/packages/pkg_to_deploy/dist-dir');
        await aws.uploadFolder(path, 'pkg_to_deploy22', 'master');

        expect(fakeS3.called).to.equal(true);
    });

    it('run upload folder failure', async () => {
        const awss3fake = sandbox.stub(AWS, 'S3');
        const fakeS3 = new FakeAwsS3();
        awss3fake.returns(fakeS3);

        const path = join(fixturesRoot, 'no/such/dir');
        await expect(aws.uploadFolder(path, 'pkg_to_deploy22', 'master')).to.be.rejectedWith('ENOENT');

        expect(fakeS3.called).to.equal(false);
    });

    xit('upload fixtures', async () => {
        const path = join(fixturesRoot, 'proj_to_deploy/packages/pkg_to_deploy/dist');
        process.env.AWS_ACCESS_KEY_ID = 'key';
        process.env.AWS_SECRET_ID = 'secret+w';
        process.env.AWS_BUCKET_NAME = 'demo.bucket.com';
        const result = await aws.uploadFolder(path, 'pkg_to_deploy', 'master');
        expect(result).to.equal(true);
    });
});
