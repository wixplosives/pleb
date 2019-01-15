const gitbubClient = require('../src/github.ts')
// const GitHub = require('github-api')
import { expect } from 'chai'

describe('github client', () => {
    it('add text', async () => {
        const body  = 'Nice PR'
        const newBody = await gitbubClient.addMessageToPRBody(body, 'another nice text')
        expect(newBody).to.equal('Nice PR\n---Demo Link---\nanother nice text')
    }),
    it('replace existing text', async () => {
        const body  = 'Nice PR\n---Demo Link---\nsome nice text'
        const newBody = await gitbubClient.addMessageToPRBody(body, 'another nice text')
        expect(newBody).to.equal('Nice PR\n---Demo Link---\nanother nice text')
    }),
    xit('gets pull request properly', async () => {
        gitbubClient.postLinkToPRTest('text', '',
            '', 'wixplosives', 'lerna-publish-test',
            1)

    })
})
