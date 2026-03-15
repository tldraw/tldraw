import { T } from '@tldraw/validate'

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
	 * your app/library name.
	 * @param options -
	 * - `defaultValue`: The default value for this style prop.
	 *
	 * - `type`: Optionally, describe what type of data you expect for this style prop.
	 *
	 * @example
	 * ```ts
	 * import {T} from '@tldraw/validate'
	 * import {StyleProp} from '@tldraw/tlschema'
	 *
	 * const MyLineWidthProp = StyleProp.define('myApp:lineWidth', {
	 *   defaultValue: 1,
	 *   type: T.number,
	 * })
	 * ```
	 * @public
	 */
	static define<Type>(
		uniqueId: string,
		options: { defaultValue: Type; type?: T.Validatable<Type> }
	) {
		const { defaultValue, type = T.any } = options
		return new StyleProp<Type>(uniqueId, defaultValue, type)
	}

	/**
	 * Define a new {@link StyleProp} as a list of possible values.
	 *
	 * @param uniqueId - Each StyleProp must have a unique ID. We recommend you prefix this with
	 * your app/library name.
	 * @param options -
	 * - `defaultValue`: The default value for this style prop.
	 *
	 * - `values`: An array of possible values of this style prop.
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
	static defineEnum<const Values extends readonly unknown[]>(
		uniqueId: string,
		options: { defaultValue: Values[number]; values: Values }
	) {
		const { defaultValue, values } = options
		return new EnumStyleProp<Values[number]>(uniqueId, defaultValue, values)
	}

	/** @internal */
	protected constructor(
		readonly id: string,
		public defaultValue: Type,
		readonly type: T.Validatable<Type>
	) {}

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
export class EnumStyleProp<T> extends StyleProp<T> {
	/** @internal */
	constructor(id: string, defaultValue: T, values: readonly T[]) {
		super(id, defaultValue, T.literalEnum(...values))
		this.values = [...values]
	}

	readonly values: T[]

	/**
	 * Add new values to this enum style prop at runtime. This is useful for extending
	 * the built-in styles with custom values (e.g. adding custom colors). Be sure to
	 * also modify the associated types.
	 *
	 * @param newValues - The new values to add.
	 *
	 * @public
	 */
	addValues(...newValues: T[]): void {
		for (const v of newValues) {
			if (!this.values.includes(v)) {
				this.values.push(v)
			}
		}
		// Rebuild the validator with the updated values
		;(this as any).type = T.literalEnum(...this.values)
	}

	/**
	 * Remove values from this enum style prop at runtime. This is useful for narrowing
	 * the built-in styles with custom values (e.g. adding custom colors). Be sure to
	 * also modify the associated types.
	 *
	 * @param valuesToRemove - The values to remove.
	 *
	 * @public
	 */
	removeValues(...valuesToRemove: T[]): void {
		for (const v of valuesToRemove) {
			if (this.values.includes(v)) {
				this.values.splice(this.values.indexOf(v), 1)
			}
		}
		// Rebuild the validator with the updated values
		;(this as any).type = T.literalEnum(...this.values)
	}
}

/**
 * @public
 */
export type StylePropValue<T extends StyleProp<any>> = T extends StyleProp<infer U> ? U : never
