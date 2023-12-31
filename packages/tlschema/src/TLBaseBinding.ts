import { BaseRecord } from '@tldraw/store'
import { Expand, JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from './misc/id-validator'
import { TLBindingId } from './records/TLBinding'
import { TLShapeId } from './records/TLShape'
import { shapeIdValidator } from './shapes/TLBaseShape'

/** @public */
export interface TLBaseBinding<Type extends string, Props extends object>
	extends BaseRecord<'binding', TLBindingId> {
	type: Type
	fromShapeId: TLShapeId
	toShapeId: TLShapeId
	props: Props
	meta: JsonObject
}

/** @public */
export const bindingIdValidator = idValidator<TLBindingId>('binding')

/** @public */
export function createBindingValidator<
	Type extends string,
	Props extends JsonObject,
	Meta extends JsonObject
>(
	type: Type,
	props?: { [K in keyof Props]: T.Validatable<Props[K]> },
	meta?: { [K in keyof Meta]: T.Validatable<Meta[K]> }
) {
	return T.object<TLBaseBinding<Type, Props>>({
		id: bindingIdValidator,
		typeName: T.literal('binding'),
		fromShapeId: shapeIdValidator,
		toShapeId: shapeIdValidator,
		type: T.literal(type),
		props: props ? T.object(props) : (T.jsonValue as T.ObjectValidator<Props>),
		meta: meta ? T.object(meta) : (T.jsonValue as T.ObjectValidator<Meta>),
	})
}

/** @public */
export type BindingProps<Binding extends TLBaseBinding<any, any>> = {
	[K in keyof Binding['props']]: T.Validatable<Binding['props'][K]>
}

export type BindingPropsType<Config extends Record<string, T.Validatable<any>>> = Expand<{
	[K in keyof Config]: T.TypeOf<Config[K]>
}>
