import { expect } from 'chai'
import { join } from 'path'
const cli = require('../src/cli.ts')

const fixturesRoot = join(__dirname, '..', 'fixtures')

describe('lerna-publisher', () => {
    it('runs nothing', async () => {
        const newpath = join('mypath','another_path')
        expect(newpath).to.equal('mypath/another_path')
        const bucketName = 'bucket.demo.com'
        const bucketLink = `http://${bucketName}.s3-website-us-east-1.amazonaws.com`
        expect(bucketLink).to.equal(`http://bucket.demo.com.s3-website-us-east-1.amazonaws.com`)

    })
    xit('Run deploy', async () => {
        const path = join(fixturesRoot, 'proj_to_deploy')
        process.env.TRAVIS_PULL_REQUEST = '1'
        process.env.AWS_BUCKET_NAME = 'bucket'
        process.env.TRAVIS_BRANCH = 'branch'
        process.env.TRAVIS_REPO_SLUG = 'org/pkg_to_deploy'
        process.env.GITHUB_TOKEN = 'token'
        cli.runDeployCommand(path, 'pkg_to_deploy')
    })
})

describe('getRepoAndOrg', () => {
    it('Splits properly', async () => {
        const githubLink = 'git@github.com:wixplosives/lerna-publisher.git'
        const [org, repo] = await cli.getRepoAndOrg(githubLink)
        expect(org).to.equal('wixplosives')
        expect(repo).to.equal('lerna-publisher')
    })
})
