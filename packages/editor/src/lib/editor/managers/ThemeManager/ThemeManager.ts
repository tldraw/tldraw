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
			appearance: 'light',
		},
		dark: {
			colors: paletteFromColorTheme(DefaultColorThemePalette.darkMode),
			appearance: 'dark',
		},
	}
}

/** @public */
export class ThemeManager {
	private readonly _themes: ReturnType<typeof atom<TLThemes>>
	private readonly _themeOverride: ReturnType<typeof atom<string | null>>

	constructor(
		private readonly editor: Editor,
		themes?: TLThemes,
		initialTheme?: string
	) {
		this._themes = atom('ThemeManager._themes', {
			...buildDefaultThemes(),
			...themes,
		})
		this._themeOverride = atom('ThemeManager._themeOverride', initialTheme ?? null)
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
	 * Set the active theme by ID, overriding the automatic dark-mode-based selection.
	 * Pass `null` to clear the override and revert to automatic selection.
	 */
	setCurrentTheme(themeId: string | null): void {
		this._themeOverride.set(themeId)
	}

	/**
	 * Get the active color mode (light or dark) for the current theme.
	 *
	 * If a theme override is set, the color mode is derived from the theme's
	 * `appearance` property, falling back to inferring from the theme ID.
	 * Otherwise, it falls back to the user's dark mode preference.
	 */
	@computed getActiveColorMode(): 'light' | 'dark' {
		const override = this._themeOverride.get()
		if (override !== null) {
			const themes = this._themes.get()
			const theme = themes[override]
			if (theme?.appearance) return theme.appearance
			return override === 'dark' ? 'dark' : 'light'
		}
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
	}

	/**
	 * Get the current theme ID.
	 *
	 * If a theme override is set, returns that. Otherwise derives from
	 * the user's dark mode preference ('light' or 'dark').
	 */
	@computed getCurrentThemeId(): string {
		const override = this._themeOverride.get()
		if (override !== null) return override
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
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
