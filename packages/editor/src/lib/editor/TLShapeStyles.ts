import {
	DefaultColorStyle,
	DefaultFontStyle,
	DefaultLabelColorStyle,
	DefaultSizeStyle,
	EnumStyleProp,
	TLDefaultColorTheme,
	TLShape,
	TLSizeTokenDefinition,
} from '@tldraw/tlschema'

/**
 * A value that can vary between light and dark mode.
 *
 * @public
 */
export type Themeable<T> = T | { light: T; dark: T }

/**
 * Makes all properties of T optional and wraps them in Themeable.
 * Used for style overrides where any property can be overridden and
 * can optionally vary by theme.
 *
 * @public
 */
export type AsStyleOverrides<T> = {
	[K in keyof T]?: Themeable<T[K]>
}

/**
 * Map from shape types to their resolved style types. Extend this via module augmentation
 * when adding getDefaultStyles to a ShapeUtil.
 *
 * @example
 * ```ts
 * declare module '@tldraw/editor' {
 *   interface TLShapeStylesMap {
 *     geo: TLGeoShapeResolvedStyles
 *   }
 * }
 * ```
 *
 * @public
 */
// NOTE: This empty interface causes api-extractor to fail for the namespaced-tldraw
// package ("Unsupported export"). It can't handle empty interfaces re-exported through
// `export *` chains. We need this exported for TLResolvedStyles to work, and users need
// it for module augmentation. TODO: find a targeted api-extractor fix.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLShapeStylesMap {}

/**
 * Get the resolved styles type for a shape, falling back to `Record\<string, unknown\>`.
 *
 * @public
 */
export type TLResolvedStyles<T extends TLShape> = T['type'] extends keyof TLShapeStylesMap
	? TLShapeStylesMap[T['type']]
	: Record<string, unknown>

/**
 * Context passed to ShapeUtil.getDefaultStyles(). Contains the resolved token config.
 *
 * @public
 */
export interface TLStyleContext {
	/** Whether the editor is in dark mode. */
	isDarkMode: boolean
	/** The resolved color theme (includes any extended colors). */
	theme: TLDefaultColorTheme
	/** The resolved size tokens (includes any extended sizes). */
	sizes: Record<string, TLSizeTokenDefinition>
	/** The resolved font family map (includes any extended fonts). CSS font-family strings keyed by font name. */
	fonts: Record<string, string>
}

/**
 * Token overrides for color, size, and font style systems.
 *
 * @public
 */
export interface TLStyleTokensConfig {
	/**
	 * Override, add, or remove color tokens.
	 * Set a color to `null` to remove it from the palette.
	 */
	colors?: Record<string, Partial<TLStylesColorDefinition> | null>
	/**
	 * Override, add, or remove size tokens.
	 * Set a size to `null` to remove it from the size palette.
	 */
	sizes?: Record<string, Partial<TLSizeTokenDefinition> | null>
	/**
	 * Override, add, or remove font tokens.
	 * Each font maps to a CSS font-family string.
	 * Set a font to `null` to remove it from the font palette.
	 */
	fonts?: Record<string, string | null>
}

/**
 * Configuration for customizing the style system. Passed as the `styles` prop on `<Tldraw>`.
 *
 * @public
 */
export interface TLStylesConfig extends TLStyleTokensConfig {
	/**
	 * Per-shape token overrides. These are merged onto the global token config
	 * when resolving styles for a shape of the matching type.
	 */
	shapes?: Record<string, TLStyleTokensConfig>
}

/**
 * Color definition for light and dark mode. Each mode contains the color variants.
 *
 * @public
 */
export interface TLStylesColorDefinition {
	light: Partial<import('@tldraw/tlschema').TLDefaultColorThemeColor>
	dark: Partial<import('@tldraw/tlschema').TLDefaultColorThemeColor>
}

/**
 * Callback for runtime shape style overrides.
 *
 * @public
 */
export type TLGetShapeStyleOverrides = (
	shape: TLShape,
	ctx: TLStyleContext
) => AsStyleOverrides<Record<string, unknown>> | undefined | void

/** Map from TLStylesConfig keys to the EnumStyleProp(s) they extend. */
const STYLE_CONFIG_PROPS: Record<string, EnumStyleProp<any>[]> = {
	colors: [DefaultColorStyle, DefaultLabelColorStyle],
	sizes: [DefaultSizeStyle],
	fonts: [DefaultFontStyle],
}

/**
 * Merge a per-shape TLStylesConfig into a TLStyleContext, producing a new context
 * with the shape-level overrides applied on top of the global config.
 *
 * @public
 */
export function mergeStylesIntoContext(
	ctx: TLStyleContext,
	config: TLStyleTokensConfig
): TLStyleContext {
	let { theme, sizes, fonts } = ctx

	if (config.colors) {
		const modeKey = ctx.isDarkMode ? 'dark' : 'light'
		const themeColors: Record<string, any> = {}
		for (const [name, def] of Object.entries(config.colors)) {
			if (def === null) continue
			const baseColor = (theme as any)[name]
			if (baseColor && def[modeKey]) {
				themeColors[name] = { ...baseColor, ...def[modeKey] }
			}
		}
		theme = { ...theme, ...themeColors }
	}

	if (config.sizes) {
		sizes = { ...sizes }
		for (const [name, def] of Object.entries(config.sizes)) {
			if (def === null) {
				delete sizes[name]
			} else {
				sizes[name] = { ...sizes[name], ...def }
			}
		}
	}

	if (config.fonts) {
		fonts = { ...fonts }
		for (const [name, def] of Object.entries(config.fonts)) {
			if (def === null) {
				delete fonts[name]
			} else {
				fonts[name] = def
			}
		}
	}

	return { ...ctx, theme, sizes, fonts }
}

/**
 * Extend the runtime validators for style props so that the store
 * accepts custom token names (and rejects nulled ones). Must run
 * before any persisted data is loaded into the store.
 *
 * @internal
 */
export function extendStyleValidators(stylesConfig: TLStylesConfig | undefined) {
	if (!stylesConfig) return
	const shapeConfigs = Object.values(stylesConfig.shapes ?? {})

	for (const [configKey, props] of Object.entries(STYLE_CONFIG_PROPS)) {
		const globalConfig = (stylesConfig as any)[configKey] as Record<string, unknown> | undefined
		const added = new Set<string>()
		const removed = new Set<string>()

		if (globalConfig) {
			for (const [name, def] of Object.entries(globalConfig)) {
				if (def === null) {
					removed.add(name)
				} else if (!props[0]._valuesSet.has(name as any)) {
					added.add(name)
				}
			}
		}

		for (const shapeConfig of shapeConfigs) {
			const config = (shapeConfig as any)[configKey] as Record<string, unknown> | undefined
			if (!config) continue
			for (const [name, def] of Object.entries(config)) {
				if (def !== null && !props[0]._valuesSet.has(name as any)) {
					added.add(name)
				}
			}
		}

		const addedValues = [...added]
		const removedValues = [...removed].filter((name) => !added.has(name))

		for (const prop of props) {
			if (addedValues.length) prop.addValues(addedValues as any)
			if (removedValues.length) prop.removeValues(removedValues as any)
		}
	}
}
