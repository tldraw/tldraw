import { deleteFromLocalStorage, setInLocalStorage } from '@tldraw/utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultUserPreferences, userTypeValidator } from './TLUserPreferences'

describe('TLUserPreferences consistency', () => {
	// When adding a new user preference, add it to this list AND update:
	// 1. TLUserPreferences interface
	// 2. userTypeValidator
	// 3. defaultUserPreferences
	// 4. Versions enum and migrateSnapshot()
	const interfaceKeys = [
		'name',
		'color',
		'locale',
		'animationSpeed',
		'areKeyboardShortcutsEnabled',
		'edgeScrollSpeed',
		'colorScheme',
		'isSnapMode',
		'isWrapMode',
		'isDynamicSizeMode',
		'isPasteAtCursorMode',
		'enhancedA11yMode',
		'inputMode',
		'isZoomDirectionInverted',
	] as const

	it('defaultUserPreferences contains all TLUserPreferences keys (except id)', () => {
		const defaultKeys = Object.keys(defaultUserPreferences).sort()
		const expected = [...interfaceKeys].sort()

		expect(defaultKeys).toEqual(expected)
	})

	it('userTypeValidator validates all TLUserPreferences keys', () => {
		// Access the internal config property to check which keys the validator covers
		const validatorKeys = Object.keys((userTypeValidator as any).config).sort()
		const expected = ['id', ...interfaceKeys].sort()

		expect(validatorKeys).toEqual(expected)
	})
})

describe('loading stored preferences', () => {
	afterEach(() => {
		deleteFromLocalStorage('TLDRAW_USER_DATA_v3')
		vi.resetModules()
	})

	it.each([
		['corrupt json', '{not json'],
		['a snapshot whose user is not an object', JSON.stringify({ version: 1, user: null })],
	])('falls back to fresh preferences for %s', async (_label, stored) => {
		setInLocalStorage('TLDRAW_USER_DATA_v3', stored)
		const { getUserPreferences } = await import('./TLUserPreferences')
		expect(getUserPreferences().id).toEqual(expect.any(String))
	})
})
