import { TLUserPreferences, atom, createTLUser } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('TLUserPreferences', () => {
	it('allows updating user preferences on the editor', () => {
		expect(editor.user.getIsSnapMode()).toBe(false)

		editor.user.updateUserPreferences({ isSnapMode: true })

		expect(editor.user.getIsSnapMode()).toBe(true)
	})

	it('can be customized', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			animationSpeed: 1,
			color: '#000000',
			id: '123',
			colorScheme: 'dark',
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

		expect(editor.user.getIsDarkMode()).toBe(true)

		userPreferences.set({
			...userPreferences.get(),
			colorScheme: 'light',
		})

		expect(editor.user.getIsDarkMode()).toBe(false)

		editor.user.updateUserPreferences({ colorScheme: 'dark' })

		expect(editor.user.getIsDarkMode()).toBe(true)
		expect(userPreferences.get().colorScheme).toBe('dark')
	})

	it('can have null values and it will use defaults', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			id: '123',
			animationSpeed: null,
			color: null,
			colorScheme: 'system',
			isSnapMode: null,
			locale: null,
			name: null,
		})
		const setUserPreferences = vi.fn((preferences) => userPreferences.set(preferences))

		editor = new TestEditor({
			user: createTLUser({
				setUserPreferences,
				userPreferences,
			}),
		})

		expect(editor.user.getAnimationSpeed()).toBe(1)
		expect(editor.user.getIsDarkMode()).toBe(false)
		expect(editor.user.getIsSnapMode()).toBe(false)
		expect(editor.user.getLocale()).toBe('en')
		expect(editor.user.getName()).toBe('')
	})

	it('can have unspecified values and it will use defaults', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			id: '123',
			name: 'blah',
		})
		const setUserPreferences = vi.fn((preferences) => userPreferences.set(preferences))

		editor = new TestEditor({
			user: createTLUser({
				setUserPreferences,
				userPreferences,
			}),
		})

		expect(editor.user.getAnimationSpeed()).toBe(1)
		expect(editor.user.getIsDarkMode()).toBe(false)
		expect(editor.user.getIsSnapMode()).toBe(false)
		expect(editor.user.getLocale()).toBe('en')
		expect(editor.user.getName()).toBe('blah')
	})

	it('allows setting values to null', () => {
		const userPreferences = atom<TLUserPreferences>('userPreferences', {
			id: '123',
			name: 'blah',
		})
		const setUserPreferences = vi.fn((preferences) => userPreferences.set(preferences))

		editor = new TestEditor({
			user: createTLUser({
				setUserPreferences,
				userPreferences,
			}),
		})
		// called once in the constructor of testeditor to set edge scroll speed to 0
		expect(setUserPreferences).toHaveBeenCalledTimes(1)

		expect(editor.user.getName()).toBe('blah')
		editor.user.updateUserPreferences({ name: null })

		expect(editor.user.getName()).toBe('')
		expect(setUserPreferences).toHaveBeenCalledTimes(2)
		expect(setUserPreferences).toHaveBeenLastCalledWith({
			id: '123',
			name: null,
			edgeScrollSpeed: 0,
		})
	})
})
