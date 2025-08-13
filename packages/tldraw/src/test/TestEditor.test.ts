import { expect, it } from 'vitest'
import { TestEditor } from './TestEditor'

it('loads the test app', () => {
	expect(() => {
		new TestEditor()
	}).not.toThrow()
})
