import { T } from '@tldraw/validate'

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

/**
 * Style overrides for geo shapes.
 * All properties are optional and support theming via `{ light: T, dark: T }` syntax.
 *
 * @public
 */
export type TLGeoShapeStyleOverrides = AsStyleOverrides<TLGeoShapeResolvedStyles>

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
 * Style overrides for draw shapes.
 * All properties are optional and support theming via `{ light: T, dark: T }` syntax.
 *
 * @public
 */
export type TLDrawShapeStyleOverrides = AsStyleOverrides<TLDrawShapeResolvedStyles>

// ────────────────────────────────────────────────────────────────────────────
// Union type for all shape style overrides
// ────────────────────────────────────────────────────────────────────────────

/**
 * Union of all possible style override types.
 *
 * @public
 */
export type TLShapeStyleOverrides = TLGeoShapeStyleOverrides | TLDrawShapeStyleOverrides

// ────────────────────────────────────────────────────────────────────────────
// Validators
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a validator for a themeable value.
 * Accepts either a direct value or an object with `light` and `dark` keys.
 */
function themeable<V>(valueValidator: T.Validatable<V>): T.Validatable<Themeable<V>> {
	return T.or(
		valueValidator,
		T.object({ light: valueValidator, dark: valueValidator })
	) as T.Validatable<Themeable<V>>
}

// Themeable validator helpers
const themeableNumber = T.optional(themeable(T.number))
const themeableString = T.optional(themeable(T.string))
const themeableBoolean = T.optional(themeable(T.boolean))
const themeableLinecap = T.optional(themeable(T.literalEnum('round', 'butt', 'square')))
const themeableLinejoin = T.optional(themeable(T.literalEnum('round', 'bevel', 'miter')))
const themeableFillType = T.optional(themeable(T.literalEnum('none', 'solid', 'pattern')))
const themeableFontWeight = T.optional(themeable(T.or(T.string, T.number)))

/**
 * Validator for geo shape style overrides.
 *
 * @public
 */
export const geoShapeStyleOverridesValidator = T.object<TLGeoShapeStyleOverrides>({
	// Stroke
	strokeWidth: themeableNumber,
	strokeColor: themeableString,
	strokeLinecap: themeableLinecap,
	strokeLinejoin: themeableLinejoin,
	strokeOpacity: themeableNumber,
	// Fill
	fillType: themeableFillType,
	fillColor: themeableString,
	fillOpacity: themeableNumber,
	// Draw style
	drawOffset: themeableNumber,
	drawRoundness: themeableNumber,
	drawPasses: themeableNumber,
	// Dash
	dashLengthRatio: themeableNumber,
	// Pattern
	patternColor: themeableString,
	// Label
	labelFontSize: themeableNumber,
	labelLineHeight: themeableNumber,
	labelPadding: themeableNumber,
	labelColor: themeableString,
	labelFontFamily: themeableString,
	labelFontWeight: themeableFontWeight,
	showLabelOutline: themeableBoolean,
})

/**
 * Validator for draw shape style overrides.
 *
 * @public
 */
export const drawShapeStyleOverridesValidator = T.object<TLDrawShapeStyleOverrides>({
	// Stroke
	strokeWidth: themeableNumber,
	strokeColor: themeableString,
	strokeOpacity: themeableNumber,
	// Fill
	fillType: themeableFillType,
	fillColor: themeableString,
	fillOpacity: themeableNumber,
	// Pattern
	patternColor: themeableString,
})

/**
 * An empty style overrides validator for shapes that don't support style overrides yet.
 *
 * @public
 */
export const emptyStyleOverridesValidator = T.object({})

/**
 * Type representing empty style overrides.
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLEmptyStyleOverrides {}
