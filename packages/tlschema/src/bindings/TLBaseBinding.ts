import { BaseRecord } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLBindingId } from '../records/TLBinding'
import { TLShapeId } from '../records/TLShape'
import { shapeIdValidator } from '../shapes/TLBaseShape'

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
	props?: { [K in keyof Props]: T.Validatable<Props[K]> },
	meta?: { [K in keyof Meta]: T.Validatable<Meta[K]> }
) {
	return T.object<TLBaseBinding<Type, Props>>({
		id: bindingIdValidator,
		typeName: T.literal('binding'),
		type: T.literal(type),
		fromId: shapeIdValidator,
		toId: shapeIdValidator,
		props: props ? T.object(props) : (T.jsonValue as any),
		meta: meta ? T.object(meta) : (T.jsonValue as any),
	})
}
