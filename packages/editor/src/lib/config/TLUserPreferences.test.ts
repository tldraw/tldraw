import { atom } from '@tldraw/state'
import { TestEditor } from '../test/TestEditor'
import { TLUserPreferences } from './TLUserPreferences'
import { createTLUser } from './createTLUser'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('TLUserPreferences', () => {
	it('allows updating user preferences on the editor', () => {
		expect(editor.isSnapMode).toBe(false)

		editor.user.updateUserPreferences({ isSnapMode: true })

		expect(editor.isSnapMode).toBe(true)
	})

	it('can be customized', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			animationSpeed: 1,
			color: '#000000',
			id: '123',
			isDarkMode: true,
			isSnapMode: false,
			locale: 'en',
			name: 'test',
		})

		editor = new TestEditor({
			user: createTLUser({
				setUserPreferences: (preferences) => userPreferences.set(preferences),
				userPreferences,
			}),
		})

		expect(editor.isDarkMode).toBe(true)

		userPreferences.set({
			...userPreferences.value,
			isDarkMode: false,
		})

		expect(editor.isDarkMode).toBe(false)

		editor.setDarkMode(true)

		expect(editor.isDarkMode).toBe(true)
		expect(userPreferences.value.isDarkMode).toBe(true)
	})
})
