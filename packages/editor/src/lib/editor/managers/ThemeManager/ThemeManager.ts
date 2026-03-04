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

function buildDefaultThemes(): TLThemes {
	return {
		light: {
			colors: paletteFromColorTheme(DefaultColorThemePalette.lightMode),
		},
		dark: {
			colors: paletteFromColorTheme(DefaultColorThemePalette.darkMode),
		},
	}
}

/** @public */
export class ThemeManager {
	private readonly _themes: ReturnType<typeof atom<TLThemes>>

	constructor(
		private readonly editor: Editor,
		themes?: TLThemes
	) {
		this._themes = atom('ThemeManager._themes', {
			...buildDefaultThemes(),
			...themes,
		})
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

	/**
	 * Get the active color mode based on the user's dark mode preference.
	 */
	@computed getActiveColorMode(): 'light' | 'dark' {
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
	}

	/**
	 * Get the current theme ID, derived from the active color mode.
	 */
	@computed getCurrentThemeId(): string {
		return this.getActiveColorMode()
	}

	@computed getCurrentTheme(): TLTheme {
		const themes = this._themes.get()
		const themeId = this.getCurrentThemeId()
		return themes[themeId] ?? themes['light']
	}

	dispose() {
		// currently no subscriptions to tear down, but here for consistency
		// with the manager pattern and for future use
	}
}
