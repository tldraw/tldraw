import { T } from '@tldraw/validate'

/** @public */
export type StyleProp<T> = {
	readonly id: string
	new (): StylePropInstance<T>
}

/** @public */
export const StyleProp = {
	define<T>({ id, type, defaultValue }: { id: string; type: T.Validatable<T>; defaultValue: T }) {
		const result = class extends StylePropInstance<T> {
			static id = id
			id = id
			type = type
			defaultValue = defaultValue
		} satisfies StyleProp<T>
		return result
	},

	defineEnum<const Values extends readonly unknown[]>({
		id,
		values,
		defaultValue,
	}: {
		id: string
		values: Values
		defaultValue: Values[number]
	}) {
		const result = class extends StyleProp.define({
			id,
			type: T.literalEnum(...values),
			defaultValue,
		}) {
			static values = values
			values = values
		} satisfies StyleProp<Values[number]>
		return result
	},
}

/** @public */
export abstract class StylePropInstance<T> implements T.Validatable<T> {
	abstract readonly id: string
	abstract readonly type: T.Validatable<T>
	abstract readonly defaultValue: T

	validate(value: unknown): T {
		return this.type.validate(value)
	}
}

/** @internal */
export type StylePropInstances = {
	stylePropsById: ReadonlyMap<string, StylePropInstance<unknown>>
	stylePropsByConstructor: ReadonlyMap<StyleProp<unknown>, StylePropInstance<unknown>>
}

export function isStyleProp(value: unknown): value is StyleProp<unknown> {
	return (
		typeof value === 'function' &&
		'prototype' in value &&
		value.prototype instanceof StylePropInstance
	)
}
