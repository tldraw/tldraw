import { atom, computed } from '@tldraw/state'
import { TLTheme, TLThemeDefinition } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import { DEFAULT_THEME, resolveTheme } from './defaultThemes'

/**
 * Manages the editor's color themes.
 *
 * Stores named theme definitions (each containing light and dark color palettes
 * alongside shared properties like font size). The active theme is resolved by
 * combining the active theme name with the user's color mode preference.
 *
 * @public
 */
export class ThemeManager {
	private readonly _definitions: ReturnType<typeof atom<Record<string, TLThemeDefinition>>>
	private readonly _activeThemeName: ReturnType<typeof atom<string>>

	constructor(
		private readonly editor: Editor,
		options?: {
			definitions?: Record<string, TLThemeDefinition>
			activeTheme?: string
		}
	) {
		this._definitions = atom('ThemeManager._definitions', {
			default: DEFAULT_THEME,
			...options?.definitions,
		})
		this._activeThemeName = atom('ThemeManager._activeThemeName', options?.activeTheme ?? 'default')
	}

	/** Get the current color mode based on the user's dark mode preference. */
	@computed getColorMode(): 'light' | 'dark' {
		return this.editor.user.getIsDarkMode() ? 'dark' : 'light'
	}

	/** Get the name of the active theme. */
	getActiveThemeName(): string {
		return this._activeThemeName.get()
	}

	/** Set the active theme by name. The theme must have been previously registered. */
	setActiveThemeName(name: string): void {
		if (process.env.NODE_ENV !== 'production') {
			if (!(name in this._definitions.get())) {
				console.warn(
					`Theme '${name}' not found. Available themes: ${Object.keys(this._definitions.get()).join(', ')}`
				)
			}
		}
		this._activeThemeName.set(name)
	}

	/** Get all registered theme definitions. */
	getThemeDefinitions(): Record<string, TLThemeDefinition> {
		return this._definitions.get()
	}

	/** Get a single theme definition by name. */
	getThemeDefinition(name: string): TLThemeDefinition | undefined {
		return this._definitions.get()[name]
	}

	/** Register or update a named theme definition. */
	setThemeDefinition(name: string, definition: TLThemeDefinition): void {
		this._definitions.update((prev) => ({ ...prev, [name]: definition }))
	}

	/** Remove a named theme definition. Cannot remove the 'default' theme. */
	removeThemeDefinition(name: string): void {
		if (name === 'default') {
			if (process.env.NODE_ENV !== 'production') {
				console.warn("Cannot remove the 'default' theme.")
			}
			return
		}
		this._definitions.update((prev) => {
			const next = { ...prev }
			delete next[name]
			return next
		})
		// If the removed theme was active, fall back to 'default'
		if (this._activeThemeName.get() === name) {
			this._activeThemeName.set('default')
		}
	}

	/**
	 * Get the resolved current theme object, based on the active theme name and color mode.
	 */
	@computed getCurrentTheme(): TLTheme {
		const name = this._activeThemeName.get()
		const definitions = this._definitions.get()
		const definition = definitions[name] ?? definitions['default']
		return resolveTheme(definition, this.getColorMode())
	}

	/** Clean up any resources held by the manager. */
	dispose() {
		// currently no subscriptions to tear down, but here for consistency
		// with the manager pattern and for future use
	}
}
