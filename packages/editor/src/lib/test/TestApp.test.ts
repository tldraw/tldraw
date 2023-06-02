import { TestApp } from './TestEditor'

it('loads the test app', () => {
	expect(() => {
		new TestApp()
	}).not.toThrow()
})
