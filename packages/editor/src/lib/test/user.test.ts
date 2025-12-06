import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [], bindingUtils: [] }),
		getContainer: () => document.body,
	})
})

describe('user', () => {
	it('gets a user with the correct color', () => {
		expect(editor.user.getIsDarkMode()).toBe(false)
	})

	it('gets a user with the correct', () => {
		editor.user.updateUserPreferences({ colorScheme: 'dark' })
		expect(editor.user.getIsDarkMode()).toBe(true)
	})
})
