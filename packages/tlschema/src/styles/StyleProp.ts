import { T } from '@tldraw/validate'

/** @public */
export class StyleProp<Type> implements T.Validatable<Type> {
	static define<Type>(
		uniqueId: string,
		{ defaultValue, type = T.any }: { defaultValue: Type; type?: T.Validatable<Type> }
	) {
		return new StyleProp<Type>(uniqueId, defaultValue, type)
	}

	static defineEnum<const Values extends readonly unknown[]>(
		uniqueId: string,
		{ defaultValue, values }: { defaultValue: Values[number]; values: Values }
	) {
		return new EnumStyleProp<Values[number]>(uniqueId, defaultValue, values)
	}

	protected constructor(
		readonly id: string,
		readonly defaultValue: Type,
		readonly type: T.Validatable<Type>
	) {}

	validate(value: unknown) {
		return this.type.validate(value)
	}
}

/** @public */
export class EnumStyleProp<T> extends StyleProp<T> {
	/** @internal */
	constructor(id: string, defaultValue: T, readonly values: readonly T[]) {
		super(id, defaultValue, T.literalEnum(...values))
	}
}
