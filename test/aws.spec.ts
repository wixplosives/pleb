import { expect } from 'chai'
import { join } from 'path'
// import * as sinon from 'sinon'

const aws = require('../src/aws.ts')
const fixturesRoot = join(__dirname, '..', 'fixtures')

describe('upload folder', () => {
    it('traverse folder strcuture properly', async () => {
        const path = join(fixturesRoot, 'proj_to_deploy', 'packages', 'pkg_to_deploy', 'dist')
        const result = await aws.walkSync(path)
        expect(result.length).to.equal(2)
        console.log(result)
    })
})
