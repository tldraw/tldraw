import { TLUserPreferences, atom, createTLUser } from '@tldraw/editor'
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

	it('can have null values and it will use defaults', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			id: '123',
			animationSpeed: null,
			color: null,
			isDarkMode: null,
			isSnapMode: null,
			locale: null,
			name: null,
		})
		const setUserPreferences = jest.fn((preferences) => userPreferences.set(preferences))

		editor = new TestEditor({
			user: createTLUser({
				setUserPreferences,
				userPreferences,
			}),
		})

		expect(editor.user.animationSpeed).toBe(1)
		expect(editor.user.isDarkMode).toBe(false)
		expect(editor.user.isSnapMode).toBe(false)
		expect(editor.user.locale).toBe('en')
		expect(editor.user.name).toBe('New User')
	})

	it('can have unspecified values and it will use defaults', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			id: '123',
			name: 'blah',
		})
		const setUserPreferences = jest.fn((preferences) => userPreferences.set(preferences))

		editor = new TestEditor({
			user: createTLUser({
				setUserPreferences,
				userPreferences,
			}),
		})

		expect(editor.user.animationSpeed).toBe(1)
		expect(editor.user.isDarkMode).toBe(false)
		expect(editor.user.isSnapMode).toBe(false)
		expect(editor.user.locale).toBe('en')
		expect(editor.user.name).toBe('blah')
	})

	it('allows setting values to null', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			id: '123',
			name: 'blah',
		})
		const setUserPreferences = jest.fn((preferences) => userPreferences.set(preferences))

		editor = new TestEditor({
			user: createTLUser({
				setUserPreferences,
				userPreferences,
			}),
		})

		expect(editor.user.name).toBe('blah')
		editor.user.updateUserPreferences({ name: null })

		expect(editor.user.name).toBe('New User')
		expect(setUserPreferences).toHaveBeenCalledTimes(1)
		expect(setUserPreferences).toHaveBeenLastCalledWith({
			id: '123',
			name: null,
		})
	})
})
