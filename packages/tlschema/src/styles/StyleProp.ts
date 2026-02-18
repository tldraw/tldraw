import { T } from '@tldraw/validate'

/**
 * Context passed to style prop resolvers.
 * @public
 */
export interface StylePropResolverContext {
	/** Whether dark mode is currently active */
	isDarkMode: boolean
}

/**
 * A function that resolves a style prop value to style overrides.
 * @public
 */
export type StylePropResolver<Type, Styles = Record<string, unknown>> = (
	value: Type,
	context: StylePropResolverContext
) => Styles

/**
 * Configuration for which shapes a style prop applies to.
 * @public
 */
export interface StylePropShapeFilter {
	/** If specified, the style prop only applies to these shape types */
	allow?: readonly string[]
	/** If specified, the style prop applies to all shapes except these types */
	deny?: readonly string[]
}

/**
 * Options for defining a {@link StyleProp}.
 * @public
 */
export interface StylePropOptions<Type, Styles = Record<string, unknown>> {
	/** The default value for this style prop */
	defaultValue: Type
	/** Optionally, describe what type of data you expect for this style prop */
	type?: T.Validatable<Type>
	/**
	 * Optional resolver that maps the prop value to style overrides.
	 * Use this for custom $ props that need to compute resolved styles.
	 *
	 * @example
	 * ```ts
	 * const WarningStyleProp = StyleProp.define('$warning', {
	 *   defaultValue: false,
	 *   type: T.boolean,
	 *   getStyles: (value) => value ? {
	 *     strokeColor: 'var(--color-warning)',
	 *   } : {},
	 * })
	 * ```
	 */
	getStyles?: StylePropResolver<Type, Styles>
	/**
	 * Priority for resolution order. Lower numbers are applied first.
	 * Built-in style props have priority 10 by default.
	 * Default: 10
	 */
	priority?: number
	/**
	 * Which shapes this style prop applies to.
	 * If not specified, applies to all shapes.
	 */
	shapes?: StylePropShapeFilter
}

/**
 * A `StyleProp` is a property of a shape that follows some special rules.
 *
 * 1. The same value can be set on lots of shapes at the same time.
 *
 * 2. The last used value is automatically saved and applied to new shapes.
 *
 * For example, {@link DefaultColorStyle} is a style prop used by tldraw's default shapes to set
 * their color. If you try selecting several shapes on tldraw.com and changing their color, you'll
 * see that the color is applied to all of them. Then, if you draw a new shape, it'll have the same
 * color as the one you just set.
 *
 * You can use styles in your own shapes by either defining your own (see {@link StyleProp.define}
 * and {@link StyleProp.defineEnum}) or using tldraw's default ones, like {@link DefaultColorStyle}.
 * When you define a shape, pass a `props` object describing all of your shape's properties, using
 * `StyleProp`s for the ones you want to be styles. See the
 * {@link https://github.com/tldraw/tldraw/tree/main/apps/examples | custom styles example}
 * for more.
 *
 * @public
 */
export class StyleProp<Type> implements T.Validatable<Type> {
	/**
	 * Define a new {@link StyleProp}.
	 *
	 * @param uniqueId - Each StyleProp must have a unique ID. We recommend you prefix this with
	 * your app/library name. For custom style props that resolve to style overrides, prefix with `$`.
	 * @param options - Configuration options for the style prop.
	 *
	 * @example
	 * ```ts
	 * import {T} from '@tldraw/validate'
	 * import {StyleProp} from '@tldraw/tlschema'
	 *
	 * // Basic style prop (like built-in ones)
	 * const MyLineWidthProp = StyleProp.define('myApp:lineWidth', {
	 *   defaultValue: 1,
	 *   type: T.number,
	 * })
	 *
	 * // Custom $ prop with resolver
	 * const WarningStyleProp = StyleProp.define('$warning', {
	 *   defaultValue: false,
	 *   type: T.boolean,
	 *   priority: 50,
	 *   getStyles: (value) => value ? { strokeColor: 'red' } : {},
	 * })
	 * ```
	 * @public
	 */
	static define<Type, Styles = Record<string, unknown>>(
		uniqueId: string,
		options: StylePropOptions<Type, Styles>
	) {
		const { defaultValue, type = T.any, getStyles, priority, shapes } = options
		return new StyleProp<Type>(uniqueId, defaultValue, type, getStyles, priority, shapes)
	}

	/**
	 * Define a new {@link StyleProp} as a list of possible values.
	 *
	 * @param uniqueId - Each StyleProp must have a unique ID. We recommend you prefix this with
	 * your app/library name.
	 * @param options - Configuration options for the enum style prop.
	 *
	 * @example
	 * ```ts
	 * import {StyleProp} from '@tldraw/tlschema'
	 *
	 * const MySizeProp = StyleProp.defineEnum('myApp:size', {
	 *   defaultValue: 'medium',
	 *   values: ['small', 'medium', 'large'],
	 * })
	 * ```
	 */
	static defineEnum<const Values extends readonly unknown[], Styles = Record<string, unknown>>(
		uniqueId: string,
		options: { defaultValue: Values[number]; values: Values } & Omit<
			StylePropOptions<Values[number], Styles>,
			'defaultValue' | 'type'
		>
	) {
		const { defaultValue, values, getStyles, priority, shapes } = options
		return new EnumStyleProp<Values[number]>(
			uniqueId,
			defaultValue,
			values,
			getStyles,
			priority,
			shapes
		)
	}

	/**
	 * The default priority for style props.
	 * Built-in props use this priority.
	 */
	static readonly DEFAULT_PRIORITY = 10

	/** @internal */
	protected constructor(
		readonly id: string,
		public defaultValue: Type,
		readonly type: T.Validatable<Type>,
		/**
		 * Optional resolver that maps the prop value to style overrides.
		 * @public
		 */
		readonly getStyles?: StylePropResolver<Type, any>,
		/**
		 * Priority for resolution order. Lower numbers are applied first.
		 * @public
		 */
		readonly priority: number = StyleProp.DEFAULT_PRIORITY,
		/**
		 * Which shapes this style prop applies to.
		 * @public
		 */
		readonly shapes?: StylePropShapeFilter
	) {}

	/**
	 * Check if this style prop applies to a given shape type.
	 * @param shapeType - The type of shape to check
	 * @returns true if this style prop applies to the shape type
	 * @public
	 */
	appliesToShape(shapeType: string): boolean {
		if (!this.shapes) return true
		if (this.shapes.allow) {
			return this.shapes.allow.includes(shapeType)
		}
		if (this.shapes.deny) {
			return !this.shapes.deny.includes(shapeType)
		}
		return true
	}

	/**
	 * Check if this style prop has a resolver (i.e., is a custom $ prop).
	 * @public
	 */
	hasResolver(): boolean {
		return !!this.getStyles
	}

	setDefaultValue(value: Type) {
		this.defaultValue = value
	}

	validate(value: unknown) {
		return this.type.validate(value)
	}

	validateUsingKnownGoodVersion(prevValue: Type, newValue: unknown) {
		if (this.type.validateUsingKnownGoodVersion) {
			return this.type.validateUsingKnownGoodVersion(prevValue, newValue)
		} else {
			return this.validate(newValue)
		}
	}
}

/**
 * See {@link StyleProp} & {@link StyleProp.defineEnum}
 *
 * @public
 */
export class EnumStyleProp<Type> extends StyleProp<Type> {
	/** @internal */
	constructor(
		id: string,
		defaultValue: Type,
		readonly values: readonly Type[],
		getStyles?: StylePropResolver<Type, any>,
		priority?: number,
		shapes?: StylePropShapeFilter
	) {
		super(id, defaultValue, T.literalEnum(...values), getStyles, priority, shapes)
	}
}

/**
 * @public
 */
export type StylePropValue<T extends StyleProp<any>> = T extends StyleProp<infer U> ? U : never
