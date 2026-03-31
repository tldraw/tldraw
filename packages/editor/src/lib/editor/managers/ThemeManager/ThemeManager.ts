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

/**
 * Manages the editor's light and dark color themes.
 *
 * The active theme is determined by the user's dark mode preference.
 * Both themes can be customized via {@link ThemeManager.updateThemes}.
 *
 * @public
 */
export class ThemeManager {
	private readonly _themes: ReturnType<typeof atom<TLThemes>>

	constructor(
		private readonly editor: Editor,
		themes?: Partial<TLThemes>
	) {
		const defaultThemes = buildDefaultThemes()
		this._themes = atom('ThemeManager._themes', {
			light: themes?.light ?? defaultThemes.light,
			dark: themes?.dark ?? defaultThemes.dark,
		})
	}

	/** Get the light and dark themes. */
	getThemes(): TLThemes {
		return this._themes.get()
	}

	/** Customize the light theme, the dark theme, or both. */
	updateThemes(themes: Partial<TLThemes>): void {
		this._themes.update((prev) => ({
			light: themes.light ?? prev.light,
			dark: themes.dark ?? prev.dark,
		}))
	}

	/**
	 * Get the current theme ID (`'light'` or `'dark'`), based on the user's dark mode preference.
	 */
	@computed getCurrentThemeId(): 'light' | 'dark' {
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
	}

	/**
	 * Get the resolved current theme object, based on the user's dark mode preference.
	 */
	@computed getCurrentTheme(): TLTheme {
		return this._themes.get()[this.getCurrentThemeId()]
	}

	/** Clean up any resources held by the manager. */
	dispose() {
		// currently no subscriptions to tear down, but here for consistency
		// with the manager pattern and for future use
	}
}
