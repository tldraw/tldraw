import { BaseRecord } from '@tldraw/store'

import {
	TypeValidator,
	booleanValidator,
	literalValidator,
	numberValidator,
	objectValidator,
	stringValidator,
} from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLParentId, TLShapeId } from '../records/TLShape'

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
export const parentIdValidator = stringValidator.refine((id) => {
	if (!id.startsWith('page:') && !id.startsWith('shape:')) {
		throw new Error('Parent ID must start with "page:" or "shape:"')
	}
	return id as TLParentId
})

/** @public */
export const shapeIdValidator = idValidator<TLShapeId>('shape')

/** @public */
export function createShapeValidator<Type extends string, Props extends object>(
	type: Type,
	props: TypeValidator<Props>
) {
	return objectValidator({
		id: shapeIdValidator,
		typeName: literalValidator('shape'),
		x: numberValidator,
		y: numberValidator,
		rotation: numberValidator,
		index: stringValidator,
		parentId: parentIdValidator,
		type: literalValidator(type),
		isLocked: booleanValidator,
		props,
	})
}
