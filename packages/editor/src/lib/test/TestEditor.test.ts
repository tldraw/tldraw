import { TestEditor } from '../editor/TestEditor'

it('loads the test app', () => {
	expect(() => {
		new TestEditor()
	}).not.toThrow()
})
