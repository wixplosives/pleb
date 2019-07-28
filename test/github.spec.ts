import { expect } from 'chai';
import { addMessageToPRBody } from '../src/github';

describe('github client', () => {
    it('add text', async () => {
        const body = 'Nice PR';
        const newBody = await addMessageToPRBody(body, 'another nice text');
        expect(newBody).to.equal('Nice PR\n---Demo Link---\nanother nice text');
    });

    it('replace existing text', async () => {
        const body = 'Nice PR\n---Demo Link---\nsome nice text';
        const newBody = await addMessageToPRBody(body, 'another nice text');
        expect(newBody).to.equal('Nice PR\n---Demo Link---\nanother nice text');
    });
});
