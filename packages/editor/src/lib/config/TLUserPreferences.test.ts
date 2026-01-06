import { describe, expect, it } from 'vitest'
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
