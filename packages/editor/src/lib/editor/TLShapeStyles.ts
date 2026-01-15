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
// Shape styles type map (module augmentation)
// ────────────────────────────────────────────────────────────────────────────

/**
 * A global map of shape types to their resolved style interfaces.
 *
 * Augment this interface to add type-safe styles for your custom shapes:
 *
 * @example
 * ```ts
 * // In your shape definition file:
 * declare module '@tldraw/editor' {
 *   interface TLShapeStylesMap {
 *     myShape: {
 *       strokeWidth: number
 *       strokeColor: string
 *       fillColor: string
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLShapeStylesMap {}

/**
 * Get the resolved styles type for a specific shape type.
 *
 * @example
 * ```ts
 * type GeoStyles = TLShapeResolvedStylesFor<'geo'>
 * // Returns TLGeoShapeResolvedStyles if 'geo' is in TLShapeStylesMap
 * ```
 *
 * @public
 */
export type TLShapeResolvedStylesFor<K extends keyof TLShapeStylesMap> = TLShapeStylesMap[K]

/**
 * Get the style overrides type for a specific shape type.
 *
 * @example
 * ```ts
 * type GeoOverrides = TLShapeStyleOverridesFor<'geo'>
 * // Returns AsStyleOverrides<TLGeoShapeResolvedStyles>
 * ```
 *
 * @public
 */
export type TLShapeStyleOverridesFor<K extends keyof TLShapeStylesMap> = AsStyleOverrides<
	TLShapeStylesMap[K]
>

/**
 * Union of all registered resolved styles types.
 *
 * If no shapes have registered styles, falls back to a generic Record type.
 *
 * @public
 */
export type TLShapeResolvedStyles = keyof TLShapeStylesMap extends never
	? Record<string, unknown>
	: TLShapeStylesMap[keyof TLShapeStylesMap]

/**
 * Union of all registered style overrides types.
 *
 * @public
 */
export type TLShapeStyleOverrides = AsStyleOverrides<TLShapeResolvedStyles>
