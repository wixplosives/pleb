import { expect } from 'chai';
import { addMessageToPRBody } from '../src/github';

describe('github client', () => {
    it('add text', () => {
        const body = 'Nice PR';
        const newBody = addMessageToPRBody(body, 'another nice text');
        expect(newBody).to.equal('Nice PR\n---Demo Link---\nanother nice text');
    });

    it('replace existing text', () => {
        const body = 'Nice PR\n---Demo Link---\nsome nice text';
        const newBody = addMessageToPRBody(body, 'another nice text');
        expect(newBody).to.equal('Nice PR\n---Demo Link---\nanother nice text');
    });
});
