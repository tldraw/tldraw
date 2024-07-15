import {
	TLBaseBinding,
	TLBaseShape,
	TLSchema,
	bindingIdValidator,
	createTLSchema,
	opacityValidator,
	parentIdValidator,
	shapeIdValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

export function makePermissiveSchema(): TLSchema {
	const schema = createTLSchema()

	const shapeValidator = T.object<TLBaseShape<any, any>>({
		id: shapeIdValidator,
		typeName: T.literal('shape'),
		x: T.number,
		y: T.number,
		rotation: T.number,
		index: T.indexKey,
		parentId: parentIdValidator,
		type: T.string,
		isLocked: T.boolean,
		opacity: opacityValidator,
		props: T.jsonValue as any,
		meta: T.jsonValue as any,
	}) as (typeof schema)['types']['shape']['validator']

	const shapeType = schema.getType('shape')
	// @ts-expect-error
	shapeType.validator = shapeValidator

	const bindingValidator = T.object<TLBaseBinding<any, any>>({
		id: bindingIdValidator,
		typeName: T.literal('binding'),
		type: T.string,
		fromId: shapeIdValidator,
		toId: shapeIdValidator,
		props: T.jsonValue as any,
		meta: T.jsonValue as any,
	}) as (typeof schema)['types']['binding']['validator']

	const bindingType = schema.getType('binding')
	// @ts-expect-error
	bindingType.validator = bindingValidator
	return schema
}
