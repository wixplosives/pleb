import { expect } from 'chai'
import { join } from 'path'


describe('pusha', () => {
    it('runs nothing', async () => {
        const newpath = join("mypath","another_path")
        expect(newpath).to.equal("mypath/another_path")
    })
})
