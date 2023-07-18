import { createTLStore } from '../config/createTLStore'
import { Editor } from '../editor/Editor'

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [] }),
		getContainer: () => document.body,
	})
})

describe('user', () => {
	it('gets a user with the correct color', () => {
		expect(editor.user.isDarkMode).toBe(false)
	})

	it('gets a user with the correct', () => {
		editor.user.updateUserPreferences({ isDarkMode: true })
		expect(editor.user.isDarkMode).toBe(true)
	})
})
