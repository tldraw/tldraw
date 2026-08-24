import { react } from '@tldraw/state'
import { TLTheme } from '@tldraw/tlschema'
import { vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { DEFAULT_THEME, getColorValue } from './defaultThemes'
import { ThemeManager, resolveThemes } from './ThemeManager'

// Optional so that other tests' theme objects still satisfy TLThemes.
declare module '@tldraw/tlschema' {
	interface TLThemes {
		ocean?: TLTheme
		sunset?: TLTheme
	}
}

const oceanTheme: TLTheme = { ...DEFAULT_THEME, id: 'ocean', fontSize: 18 }
const sunsetTheme: TLTheme = { ...DEFAULT_THEME, id: 'sunset', strokeWidth: 3 }

let editor: TestEditor
let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	editor = new TestEditor()
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	warn.mockRestore()
	editor.dispose()
})

describe('resolveThemes', () => {
	it('returns only the default theme when nothing is provided', () => {
		expect(resolveThemes()).toEqual({ default: DEFAULT_THEME })
	})

	it('merges custom themes alongside the default', () => {
		expect(resolveThemes({ ocean: oceanTheme })).toEqual({
			default: DEFAULT_THEME,
			ocean: oceanTheme,
		})
	})

	it('lets a custom default replace the built-in default', () => {
		const custom = { ...DEFAULT_THEME, fontSize: 99 }
		expect(resolveThemes({ default: custom }).default).toBe(custom)
	})
})

describe('ThemeManager', () => {
	function createManager(themes = resolveThemes({ ocean: oceanTheme }), initial = 'default') {
		return new ThemeManager(editor, { themes, initial: initial as 'default' })
	}

	it('exposes the registered themes and the initial theme', () => {
		const manager = createManager()

		expect(manager.getThemes()).toEqual({ default: DEFAULT_THEME, ocean: oceanTheme })
		expect(manager.getTheme('ocean')).toBe(oceanTheme)
		expect(manager.getTheme('sunset')).toBeUndefined()
		expect(manager.getCurrentThemeId()).toBe('default')
		expect(manager.getCurrentTheme()).toBe(DEFAULT_THEME)
	})

	it('starts on the requested initial theme', () => {
		const manager = createManager(undefined, 'ocean')
		expect(manager.getCurrentThemeId()).toBe('ocean')
		expect(manager.getCurrentTheme()).toBe(oceanTheme)
	})

	describe('setCurrentTheme', () => {
		it('switches to a registered theme', () => {
			const manager = createManager()
			manager.setCurrentTheme('ocean')

			expect(manager.getCurrentThemeId()).toBe('ocean')
			expect(manager.getCurrentTheme()).toBe(oceanTheme)
			expect(warn).not.toHaveBeenCalled()
		})

		// Locks in current behaviour, see #10558.
		it('warns for an unknown theme id and leaves the current theme unresolved', () => {
			const manager = createManager()
			manager.setCurrentTheme('sunset')

			expect(warn).toHaveBeenCalledWith(
				"Theme 'sunset' not found. Available themes: default, ocean"
			)
			expect(manager.getCurrentThemeId()).toBe('sunset')
			expect(manager.getCurrentTheme()).toBeUndefined()
		})

		it('is reactive', () => {
			const manager = createManager()
			const seen: string[] = []
			const stop = react('theme', () => {
				seen.push(manager.getCurrentTheme()?.id)
			})

			manager.setCurrentTheme('ocean')
			manager.setCurrentTheme('default')

			expect(seen).toEqual(['default', 'ocean', 'default'])
			stop()
		})
	})

	describe('updateThemes', () => {
		it('replaces all themes when given an object', () => {
			const manager = createManager()
			manager.updateThemes({ default: DEFAULT_THEME, sunset: sunsetTheme })

			expect(manager.getThemes()).toEqual({ default: DEFAULT_THEME, sunset: sunsetTheme })
			expect(manager.getTheme('ocean')).toBeUndefined()
		})

		it('passes a deep copy to the callback so mutations do not leak', () => {
			const manager = createManager()
			const before = manager.getThemes()

			manager.updateThemes((themes) => {
				expect(themes).not.toBe(before)
				expect(themes.ocean).not.toBe(before.ocean)
				expect(themes.ocean).toBeDefined()
				expect(themes).toEqual(before)
				themes.ocean!.fontSize = 42
				return themes
			})

			expect(before.ocean!.fontSize).toBe(18)
			expect(manager.getTheme('ocean')!.fontSize).toBe(42)
		})

		it('falls back to the default theme when the current theme is removed', () => {
			const manager = createManager(undefined, 'ocean')

			manager.updateThemes((themes) => {
				delete themes.ocean
				return themes
			})

			expect(manager.getCurrentThemeId()).toBe('default')
			expect(manager.getCurrentTheme()).toEqual(DEFAULT_THEME)
		})

		it('keeps the current theme when it survives the update', () => {
			const manager = createManager(undefined, 'ocean')
			manager.updateThemes({ default: DEFAULT_THEME, ocean: { ...oceanTheme, fontSize: 30 } })

			expect(manager.getCurrentThemeId()).toBe('ocean')
			expect(manager.getCurrentTheme().fontSize).toBe(30)
		})

		it('refuses to remove the default theme', () => {
			const manager = createManager()
			const before = manager.getThemes()

			manager.updateThemes({ ocean: oceanTheme } as unknown as typeof before)

			expect(warn).toHaveBeenCalledWith("The 'default' theme cannot be removed.")
			expect(manager.getThemes()).toBe(before)
		})
	})

	describe('updateTheme', () => {
		it('registers a new theme keyed by its id', () => {
			const manager = createManager()
			manager.updateTheme(sunsetTheme)

			expect(manager.getThemes()).toEqual({
				default: DEFAULT_THEME,
				ocean: oceanTheme,
				sunset: sunsetTheme,
			})
		})

		it('overwrites an existing theme', () => {
			const manager = createManager()
			const updated = { ...oceanTheme, fontSize: 12 }
			manager.updateTheme(updated)

			expect(manager.getTheme('ocean')).toBe(updated)
			expect(manager.getTheme('default')).toBe(DEFAULT_THEME)
		})
	})

	describe('getColorMode', () => {
		it('is light by default', () => {
			expect(createManager().getColorMode()).toBe('light')
		})

		it('follows the user color scheme preference', () => {
			const manager = createManager()

			editor.user.updateUserPreferences({ colorScheme: 'dark' })
			expect(manager.getColorMode()).toBe('dark')

			editor.user.updateUserPreferences({ colorScheme: 'light' })
			expect(manager.getColorMode()).toBe('light')
		})

		it('resolves system to the system color scheme', () => {
			const manager = createManager()
			editor.user.updateUserPreferences({ colorScheme: 'system' })
			expect(manager.getColorMode()).toBe('light')

			editor.user.systemColorScheme.set('dark')
			expect(manager.getColorMode()).toBe('dark')

			editor.user.systemColorScheme.set('light')
			expect(manager.getColorMode()).toBe('light')
		})

		it('is reactive', () => {
			const manager = createManager()
			const seen: string[] = []
			const stop = react('color mode', () => {
				seen.push(manager.getColorMode())
			})

			editor.setColorMode('dark')
			editor.setColorMode('dark')
			editor.setColorMode('light')

			expect(seen).toEqual(['light', 'dark', 'light'])
			stop()
		})
	})
})

describe('editor theme api', () => {
	it('boots with custom themes and an initial theme', () => {
		const themed = new TestEditor({ themes: { ocean: oceanTheme }, initialTheme: 'ocean' })
		try {
			expect(themed.getThemes()).toEqual({ default: DEFAULT_THEME, ocean: oceanTheme })
			expect(themed.getCurrentThemeId()).toBe('ocean')
			expect(themed.getCurrentTheme()).toBe(oceanTheme)
			expect(themed.getTheme('default')).toBe(DEFAULT_THEME)
		} finally {
			themed.dispose()
		}
	})

	it('forwards theme updates to the manager and returns the editor for chaining', () => {
		expect(editor.updateTheme(oceanTheme)).toBe(editor)
		expect(editor.setCurrentTheme('ocean')).toBe(editor)
		expect(editor.getCurrentTheme()).toBe(oceanTheme)

		expect(editor.updateThemes({ default: DEFAULT_THEME })).toBe(editor)
		expect(editor.getCurrentThemeId()).toBe('default')
	})

	it('setColorMode updates the user preference and the resolved color mode', () => {
		expect(editor.setColorMode('dark')).toBe(editor)
		expect(editor.user.getUserPreferences().colorScheme).toBe('dark')
		expect(editor.getColorMode()).toBe('dark')
	})

	it('reads palette colors for the current theme and color mode', () => {
		const light = editor.getCurrentTheme().colors.light
		const dark = editor.getCurrentTheme().colors.dark

		expect(getColorValue(light, 'red', 'solid')).toBe('#e03131')
		expect(getColorValue(light, 'red', 'linedFill')).toBe('#e75f5f')
		expect(getColorValue(dark, 'red', 'linedFill')).toBe('#c31d1d')
		expect(getColorValue(light, '#ff0000', 'solid')).toBe('#ff0000')
		expect(getColorValue(light, 'not-a-color', 'fill')).toBe('not-a-color')
	})
})
