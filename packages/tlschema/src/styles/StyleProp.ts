import { Expand } from '@tldraw/utils'
import { T } from '@tldraw/validate'

/** @public */
export interface StyleProp<T> {
	readonly uniqueStylePropId: string
	readonly type: T.Validatable<T>
	readonly validate: (value: unknown) => T
	readonly defaultValue: T
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace StyleProp {
	export function define<T, Prop extends Omit<StyleProp<T>, 'uniqueStylePropId' | 'validate'>>(
		id: string,
		prop: Prop
	) {
		const style = {
			uniqueStylePropId: id,
			validate: (value): T => prop.type.validate(value),
			...prop,
		} satisfies StyleProp<T>
		return style as Expand<typeof style>
	}

	export function defineEnum<
		const Values extends readonly unknown[],
		Prop extends Omit<StyleProp<Values[number]>, 'uniqueStylePropId' | 'type' | 'validate'>
	>(id: string, values: Values, prop: Prop) {
		return StyleProp.define(id, {
			...prop,
			type: T.literalEnum(...values),
			values,
		}) satisfies StyleProp<Values[number]>
	}

	export function isStyleProp(value: unknown): value is StyleProp<unknown> {
		return typeof value === 'object' && value !== null && 'uniqueStylePropId' in value
	}
}
