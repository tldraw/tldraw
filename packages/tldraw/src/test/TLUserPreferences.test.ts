import { atom } from '@tldraw/state'
import { TLUserPreferences, createTLUser } from '../lib/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('TLUserPreferences', () => {
	it('allows updating user preferences on the editor', () => {
		expect(editor.user.isSnapMode).toBe(false)

		editor.user.updateUserPreferences({ isSnapMode: true })

		expect(editor.user.isSnapMode).toBe(true)
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

		expect(editor.user.isDarkMode).toBe(true)

		userPreferences.set({
			...userPreferences.value,
			isDarkMode: false,
		})

		expect(editor.user.isDarkMode).toBe(false)

		editor.user.updateUserPreferences({ isDarkMode: true })

		expect(editor.user.isDarkMode).toBe(true)
		expect(userPreferences.value.isDarkMode).toBe(true)
	})
})
