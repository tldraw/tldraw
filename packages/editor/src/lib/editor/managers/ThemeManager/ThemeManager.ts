import { Atom, atom, computed } from '@tldraw/state'
import { TLTheme, TLThemeId, TLThemes } from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { DEFAULT_THEME } from './defaultThemes'

/**
 * Resolve a partial set of user-provided themes into a complete `TLThemes`
 * record by merging with `DEFAULT_THEME`. The result is suitable for passing to
 * `registerColorsFromThemes`, `registerFontsFromThemes`, and the
 * `ThemeManager` constructor.
 *
 * @public
 */
export function resolveThemes(themes?: Partial<TLThemes>): TLThemes {
	return { default: DEFAULT_THEME, ...themes } as TLThemes
}

/**
 * Manages the editor's color themes.
 *
 * Stores named theme definitions (each containing light and dark color palettes
 * alongside shared properties like font size). The current theme is resolved by
 * combining the current theme name with the user's color mode preference.
 *
 * **Terminology:**
 * - **Theme** (`TLTheme`): A named set of colors and typographic values for both light and dark modes.
 * - **Color mode** (`'light' | 'dark'`): The resolved appearance mode, derived from the user's
 *   `colorScheme` preference (`'light' | 'dark' | 'system'`). Access via `getColorMode()`.
 *
 * @public
 */
export class ThemeManager {
	private readonly _themes: Atom<TLThemes>
	private readonly _currentThemeId: Atom<TLThemeId>

	constructor(
		private readonly editor: Editor,
		options: {
			themes: TLThemes
			initial: TLThemeId
		}
	) {
		this._themes = atom('ThemeManager._definitions', options.themes)
		this._currentThemeId = atom('ThemeManager._currentThemeName', options.initial)
	}

	/** Get the current color mode based on the user's dark mode preference. */
	@computed getColorMode(): 'light' | 'dark' {
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
	}

	/** Get all registered theme definitions. */
	getThemes(): TLThemes {
		return this._themes.get()
	}

	/** Get a single theme definition by id. */
	getTheme(id: TLThemeId): TLTheme | undefined {
		return this._themes.get()[id]
	}

	/** Get the id of the current theme. */
	getCurrentThemeId(): TLThemeId {
		return this._currentThemeId.get()
	}

	getCurrentTheme(): TLTheme {
		return this._themes.get()[this.getCurrentThemeId()]!
	}

	/** Set the current theme by id. The theme must have been previously registered. */
	setCurrentTheme(id: TLThemeId): void {
		if (process.env.NODE_ENV !== 'production') {
			if (!(id in this._themes.get())) {
				console.warn(
					`Theme '${id}' not found. Available themes: ${Object.keys(this._themes.get()).join(', ')}`
				)
			}
		}

		this._currentThemeId.set(id)
	}

	/** Replace all theme definitions, or update them via a callback that receives a deep copy. */
	updateThemes(themes: TLThemes | ((themes: TLThemes) => TLThemes)): void {
		this._themes.update((prev) => {
			const next = typeof themes === 'function' ? themes(structuredClone(prev)) : themes
			if (process.env.NODE_ENV !== 'production') {
				if (!('default' in next)) {
					console.warn("The 'default' theme cannot be removed.")
					return prev
				}
			}
			// If the current theme was removed, fall back to 'default'
			if (!(this._currentThemeId.get() in next)) {
				this._currentThemeId.set('default')
			}
			return next
		})
	}

	/** Register or update a named theme definition. */
	updateTheme(theme: TLTheme): void {
		this._themes.update((prev) => ({
			...prev,
			[theme.id]: theme,
		}))
	}

	/** Clean up any resources held by the manager. */
	dispose() {
		// currently no subscriptions to tear down, but here for consistency
		// with the manager pattern and for future use
	}
}
