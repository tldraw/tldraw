import { TestApp } from './TestApp'

it('loads the test app', () => {
	expect(() => {
		new TestApp()
	}).not.toThrow()
})
