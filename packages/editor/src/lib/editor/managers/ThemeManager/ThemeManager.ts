import { atom, computed } from '@tldraw/state'
import { TLTheme, TLThemes } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from './defaultThemes'

function buildDefaultThemes(): TLThemes {
	return {
		light: DEFAULT_LIGHT_THEME,
		dark: DEFAULT_DARK_THEME,
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
	 * Get the current theme ID.
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
