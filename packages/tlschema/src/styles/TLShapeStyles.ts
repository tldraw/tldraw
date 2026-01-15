// ────────────────────────────────────────────────────────────────────────────
// Themeable utilities
// ────────────────────────────────────────────────────────────────────────────

/**
 * A value that can be themed for light/dark mode.
 * Either a direct value or an object with `light` and `dark` variants.
 *
 * @example
 * ```ts
 * // Same color in both themes
 * strokeColor: '#ff0000'
 *
 * // Different colors per theme
 * strokeColor: { light: '#ff0000', dark: '#ff6666' }
 * ```
 *
 * @public
 */
export type Themeable<T> = T | { light: T; dark: T }

/**
 * Check if a value is a themed value (has light/dark variants).
 *
 * @public
 */
export function isThemedValue<T>(value: Themeable<T>): value is { light: T; dark: T } {
	return typeof value === 'object' && value !== null && 'light' in value && 'dark' in value
}

/**
 * Resolve a themeable value based on the current theme.
 *
 * @public
 */
export function resolveThemeable<T>(value: Themeable<T>, isDarkMode: boolean): T {
	if (isThemedValue(value)) {
		return isDarkMode ? value.dark : value.light
	}
	return value
}

/**
 * Utility type to convert a resolved styles interface into an overrides interface.
 * Makes all properties optional and wraps values in Themeable<T>.
 *
 * @public
 */
export type AsStyleOverrides<T> = {
	[K in keyof T]?: Themeable<T[K]>
}

// ────────────────────────────────────────────────────────────────────────────
// Geo shape styles
// ────────────────────────────────────────────────────────────────────────────

/**
 * The resolved/computed styles for a geo shape.
 * These are the actual values derived from shape props and overrides.
 *
 * @public
 */
export interface TLGeoShapeResolvedStyles {
	// Stroke
	strokeWidth: number
	strokeColor: string
	strokeLinecap: 'round' | 'butt' | 'square'
	strokeLinejoin: 'round' | 'bevel' | 'miter'
	strokeOpacity: number

	// Fill
	fillType: 'none' | 'solid' | 'pattern'
	fillColor: string
	fillOpacity: number

	// Draw style (for 'draw' dash style - hand-drawn look)
	drawOffset: number
	drawRoundness: number
	drawPasses: number

	// Dash
	dashLengthRatio: number

	// Pattern (patternUrl computed at render time based on zoom)
	patternColor: string

	// Label
	labelFontSize: number
	labelLineHeight: number
	labelPadding: number
	labelColor: string
	labelFontFamily: string
	labelFontWeight: string | number
	showLabelOutline: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// Draw shape styles
// ────────────────────────────────────────────────────────────────────────────

/**
 * The resolved/computed styles for a draw shape.
 * These are the actual values derived from shape props and overrides.
 *
 * @public
 */
export interface TLDrawShapeResolvedStyles {
	// Stroke
	strokeWidth: number
	strokeColor: string
	strokeOpacity: number

	// Fill
	fillType: 'none' | 'solid' | 'pattern'
	fillColor: string
	fillOpacity: number

	// Pattern (patternUrl computed at render time based on zoom)
	patternColor: string
}

/**
 * Union type for all shape style overrides.
 *
 * @public
 */

export type TLShapeResolvedStyles = TLGeoShapeResolvedStyles | TLDrawShapeResolvedStyles

/**
 * Union of all possible style override types.
 *
 * @public
 */
export type TLShapeStyleOverrides = AsStyleOverrides<TLShapeResolvedStyles>
