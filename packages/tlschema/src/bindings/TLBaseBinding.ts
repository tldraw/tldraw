import { BaseRecord } from '@tldraw/store'
import { JsonObject, mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLBindingId } from '../records/TLBinding'
import { TLShapeId } from '../records/TLShape'
import { shapeIdValidator } from '../shapes/TLBaseShape'
import { isStyleProp2, StyleProp2 } from '../styles/StyleProp'

/** @public */
export interface TLBaseBinding<Type extends string, Props extends object>
	extends BaseRecord<'binding', TLBindingId> {
	type: Type
	fromId: TLShapeId
	toId: TLShapeId
	props: Props
	meta: JsonObject
}

/** @public */
export const bindingIdValidator = idValidator<TLBindingId>('binding')

/** @public */
export function createBindingValidator<
	Type extends string,
	Props extends JsonObject,
	Meta extends JsonObject,
>(
	type: Type,
	props?: { [K in keyof Props]: T.Validatable<Props[K]> | StyleProp2<string> },
	meta?: { [K in keyof Meta]: T.Validatable<Meta[K]> }
) {
	return T.object<TLBaseBinding<Type, Props>>({
		id: bindingIdValidator,
		typeName: T.literal('binding'),
		type: T.literal(type),
		fromId: shapeIdValidator,
		toId: shapeIdValidator,
		props: props
			? T.object(
					mapObjectMapValues(props, (_, value) => {
						if (isStyleProp2(value)) {
							throw new Error('Style props are not allowed in binding props')
						}
						return value
					})
				)
			: (T.jsonValue as any),
		meta: meta ? T.object(meta) : (T.jsonValue as any),
	})
}
