import { open, getLastVersion } from '../index.mjs'

describe('Module loads ', function() {
    it('has open', function() {
    	'function'.should.equal(typeof open)
    })
})
