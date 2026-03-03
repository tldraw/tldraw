import { atom, computed } from '@tldraw/state'
import {
	DefaultColorThemePalette,
	TLDefaultColorTheme,
	TLTheme,
	TLThemeColorPalette,
	TLThemes,
} from '@tldraw/tlschema'
import type { Editor } from '../../Editor'

function paletteFromColorTheme(theme: TLDefaultColorTheme): TLThemeColorPalette {
	const { id: _, ...palette } = theme
	return palette as TLThemeColorPalette
}

function buildDefaultTheme(): TLTheme {
	return {
		color: {
			light: paletteFromColorTheme(DefaultColorThemePalette.lightMode),
			dark: paletteFromColorTheme(DefaultColorThemePalette.darkMode),
		},
	}
}

/** @public */
export class ThemeManager {
	private readonly _themes: ReturnType<typeof atom<TLThemes>>
	private readonly _currentThemeId: ReturnType<typeof atom<string>>

	constructor(
		private readonly editor: Editor,
		themes?: TLThemes
	) {
		this._themes = atom('ThemeManager._themes', {
			default: buildDefaultTheme(),
			...themes,
		})
		this._currentThemeId = atom('ThemeManager._currentThemeId', 'default')
	}

	getThemes(): TLThemes {
		return this._themes.get()
	}

	updateThemes(themes: Partial<TLThemes>): void {
		this._themes.update((prev) => {
			const next = { ...prev }
			for (const [key, value] of Object.entries(themes)) {
				if (value !== undefined) {
					next[key] = value
				}
			}
			return next
		})
	}

	getCurrentThemeId(): string {
		return this._currentThemeId.get()
	}

	setCurrentTheme(id: string): void {
		this._currentThemeId.set(id)
	}

	/**
	 * Get the active color mode based on the user's dark mode preference.
	 */
	@computed getActiveColorMode(): 'light' | 'dark' {
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
	}

	@computed getCurrentTheme(): TLThemeColorPalette {
		const themes = this._themes.get()
		const themeId = this._currentThemeId.get()
		const theme = themes[themeId] ?? themes['default']
		const isDarkMode = this.editor.user.getIsDarkMode()
		return isDarkMode ? theme.color.dark : theme.color.light
	}

	dispose() {
		// currently no subscriptions to tear down, but here for consistency
		// with the manager pattern and for future use
	}
}
