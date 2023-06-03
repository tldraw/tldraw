import { BaseRecord } from '@tldraw/tlstore'
import { T } from '@tldraw/validate'
import { TLParentId, TLShapeId } from '../records/TLShape'
import { parentIdValidator, shapeIdValidator } from '../validation'

/** @public */
export interface TLBaseShape<Type extends string, Props extends object>
	extends BaseRecord<'shape', TLShapeId> {
	type: Type
	x: number
	y: number
	rotation: number
	index: string
	parentId: TLParentId
	isLocked: boolean
	props: Props
}

/** @public */
export function createShapeValidator<Type extends string, Props extends object>(
	type: Type,
	props: T.Validator<Props>
) {
	return T.object({
		id: shapeIdValidator,
		typeName: T.literal('shape'),
		x: T.number,
		y: T.number,
		rotation: T.number,
		index: T.string,
		parentId: parentIdValidator,
		type: T.literal(type),
		isLocked: T.boolean,
		props,
	})
}
