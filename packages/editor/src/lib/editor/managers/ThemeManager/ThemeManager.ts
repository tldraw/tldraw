import { Atom, atom, computed, transact } from '@tldraw/state'
import { TLTheme, TLThemeId } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import { DEFAULT_THEME } from './defaultThemes'

/**
 * Manages the editor's color themes.
 *
 * Stores named theme definitions (each containing light and dark color palettes
 * alongside shared properties like font size). The active theme is resolved by
 * combining the active theme name with the user's color mode preference.
 *
 * **Terminology:**
 * - **Theme** (`TLTheme`): A named set of colors and typographic values for both light and dark modes.
 * - **Color mode** (`'light' | 'dark'`): The resolved appearance mode, derived from the user's
 *   `colorScheme` preference (`'light' | 'dark' | 'system'`). Access via `getColorMode()`.
 *
 * @public
 */
export class ThemeManager {
	private readonly _themes: Atom<Record<TLThemeId, TLTheme>>
	private readonly _currentThemeId: Atom<TLThemeId>

	constructor(
		private readonly editor: Editor,
		options?: {
			themes?: Partial<Record<TLThemeId, TLTheme>>
			initial?: TLThemeId
		}
	) {
		this._themes = atom('ThemeManager._definitions', {
			default: DEFAULT_THEME,
			...options?.themes,
		})
		this._currentThemeId = atom('ThemeManager._activeThemeName', options?.initial ?? 'default')
	}

	/** Get the current color mode based on the user's dark mode preference. */
	@computed getColorMode(): 'light' | 'dark' {
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
	}

	/** Get all registered theme definitions. */
	getThemes(): Record<TLThemeId, TLTheme> {
		return this._themes.get()
	}

	/** Get a single theme definition by name. */
	getTheme(id: TLThemeId): TLTheme | undefined {
		return this._themes.get()[id]
	}

	/** Get the id of the active theme. */
	getCurrentThemeId(): TLThemeId {
		return this._currentThemeId.get()
	}

	getCurrentTheme(): TLTheme {
		return this._themes.get()[this.getCurrentThemeId()]!
	}

	/** Set the active theme by name. The theme must have been previously registered. */
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

	updateThemes(
		themes:
			| Record<TLThemeId, TLTheme>
			| ((themes: Record<TLThemeId, TLTheme>) => Record<TLThemeId, TLTheme>)
	): void {
		if (typeof themes === 'function') {
			this._themes.update((prev) => themes(prev))
			return
		}

		this._themes.update((prev) => ({ ...prev, ...themes }))
	}

	/** Register or update a named theme definition. */
	updateTheme(
		id: TLThemeId,
		definition: Partial<TLTheme> | ((definition: TLTheme) => TLTheme)
	): void {
		this._themes.update((prev) => ({
			...prev,
			[id]:
				typeof definition === 'function' ? definition(prev[id]) : { ...prev[id], ...definition },
		}))
	}

	/** Remove a named theme definition. Cannot remove the 'default' theme. */
	removeTheme(id: TLThemeId): void {
		if (id === 'default') {
			if (process.env.NODE_ENV !== 'production') {
				console.warn("Cannot remove the 'default' theme. Try updating it instead.")
			}
			return
		}

		transact(() => {
			this._themes.update((prev) => {
				const next = { ...prev }
				delete next[id]
				return next
			})

			// If the removed theme was active, fall back to 'default'
			if (this._currentThemeId.get() === id) {
				this._currentThemeId.set('default')
			}
		})
	}

	/** Clean up any resources held by the manager. */
	dispose() {
		// currently no subscriptions to tear down, but here for consistency
		// with the manager pattern and for future use
	}
}
