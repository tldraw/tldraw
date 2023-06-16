import { T } from '@tldraw/validate'

interface StylePropContext {
	readonly isDarkMode: boolean
}

interface BasicStylePropOpts<Type> {
	defaultValue: Type
	type: T.Validatable<Type>
}

interface BasicEnumStylePropOpts<Values extends readonly unknown[]> {
	defaultValue: Values[number]
	values: Values
}

interface AdvancedStylePropOpts<Type, Config, RuntimeType> {
	config: Config
	getValue: (value: Type, config: Config, context: StylePropContext) => RuntimeType
}

export type UnknownStyleProp<T = unknown> = StyleProp<T, any, any>

/** @public */
export class StyleProp<Type, Config = unknown, RuntimeType = unknown>
	implements T.Validatable<Type>
{
	static define<Type>(
		uniqueId: string,
		opts: BasicStylePropOpts<Type>
	): StyleProp<Type, undefined, Type> {
		return new StyleProp(uniqueId, opts)
	}

	static defineEnum<const Values extends readonly unknown[]>(
		uniqueId: string,
		opts: BasicEnumStylePropOpts<Values>
	): EnumStyleProp<Values, undefined, Values[number]> {
		return new EnumStyleProp(uniqueId, opts)
	}

	protected constructor(
		readonly id: string,
		opts: BasicStylePropOpts<Type> & Partial<AdvancedStylePropOpts<Type, Config, RuntimeType>>
	) {
		this.type = opts.type
		this.defaultValue = opts.defaultValue
		// @ts-expect-error
		this.getValue = opts.getValue ?? ((value) => value)
		this.defaultConfig = opts.config!
		this.configure = opts.config ? (config) => ({ styleProp: this, config }) : (undefined as any)
	}

	private readonly type: T.Validatable<Type>
	readonly defaultValue: Type
	readonly getValue: (value: Type, config: Config, context: StylePropContext) => RuntimeType
	readonly defaultConfig: Config

	validate(value: unknown) {
		return this.type.validate(value)
	}

	withConfig<Config, RuntimeType>(
		opts: AdvancedStylePropOpts<Type, Config, RuntimeType>
	): StyleProp<Type, Config, RuntimeType> {
		return new StyleProp(this.id, {
			type: this.type,
			defaultValue: this.defaultValue,
			...opts,
		}) as any
	}

	configure: Config extends undefined ? never : (config: Config) => StyleConfig<Config, this>
}

/** @public */
export class EnumStyleProp<
	Values extends readonly unknown[],
	Config = undefined,
	RuntimeType = unknown
> extends StyleProp<Values[number], Config, RuntimeType> {
	/** @internal */
	constructor(
		id: string,
		{
			values,
			...opts
		}: BasicEnumStylePropOpts<Values> &
			Partial<AdvancedStylePropOpts<Values[number], Config, RuntimeType>>
	) {
		super(id, {
			...opts,
			type: T.literalEnum(...values),
		})
		this.values = values
	}

	readonly values: Values

	override withConfig<Config, RuntimeType>(
		opts: AdvancedStylePropOpts<Values[number], Config, RuntimeType>
	): StyleProp<Values[number], Config, RuntimeType> {
		return new EnumStyleProp(this.id, {
			values: this.values,
			defaultValue: this.defaultValue,
			...opts,
		}) as any
	}
}

export type StyleConfig<Config, Prop extends StyleProp<any, Config, any>> = {
	styleProp: Prop
	config: Config
}
