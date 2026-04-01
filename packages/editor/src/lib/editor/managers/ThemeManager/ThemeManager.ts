import { Atom, atom, computed } from '@tldraw/state'
import { TLTheme, TLThemeId } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import { DEFAULT_THEME } from './defaultThemes'

/**
 * Merge a partial theme into a base theme, filling in missing top-level
 * fields from the base.
 *
 * @internal
 */
export function mergeTheme(base: TLTheme, input: Partial<TLTheme>): TLTheme {
	return {
		fontSize: input.fontSize ?? base.fontSize,
		lineHeight: input.lineHeight ?? base.lineHeight,
		strokeWidth: input.strokeWidth ?? base.strokeWidth,
		fonts: input.fonts ?? base.fonts,
		colors: input.colors ?? base.colors,
	}
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
	private readonly _themes: Atom<Record<TLThemeId, TLTheme>>
	private readonly _currentThemeId: Atom<TLThemeId>

	constructor(
		private readonly editor: Editor,
		options?: {
			themes?: Partial<Record<TLThemeId, Partial<TLTheme>>>
			initial?: TLThemeId
		}
	) {
		const resolved = { default: DEFAULT_THEME } as Record<TLThemeId, TLTheme>
		if (options?.themes) {
			for (const [id, input] of Object.entries(options.themes) as [TLThemeId, Partial<TLTheme>][]) {
				if (input) {
					resolved[id] = mergeTheme(resolved[id] ?? DEFAULT_THEME, input)
				}
			}
		}
		this._themes = atom('ThemeManager._definitions', resolved)
		this._currentThemeId = atom('ThemeManager._currentThemeName', options?.initial ?? 'default')
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

	/** Get the id of the current theme. */
	getCurrentThemeId(): TLThemeId {
		return this._currentThemeId.get()
	}

	getCurrentTheme(): TLTheme {
		return this._themes.get()[this.getCurrentThemeId()]!
	}

	/** Set the current theme by name. The theme must have been previously registered. */
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
		this._themes.update((prev) => {
			const next = typeof themes === 'function' ? themes(prev) : { ...prev, ...themes }
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
	updateTheme(
		id: TLThemeId,
		definition: Partial<TLTheme> | ((definition: TLTheme) => TLTheme)
	): void {
		this._themes.update((prev) => ({
			...prev,
			[id]:
				typeof definition === 'function'
					? definition(prev[id])
					: mergeTheme(prev[id] ?? DEFAULT_THEME, definition),
		}))
	}

	/** Clean up any resources held by the manager. */
	dispose() {
		// currently no subscriptions to tear down, but here for consistency
		// with the manager pattern and for future use
	}
}
