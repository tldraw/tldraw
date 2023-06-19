import { BaseRecord } from '@tldraw/store'
import { Expand, assertExists, mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { TLOpacityType, opacityValidator } from '../misc/TLOpacity'
import { idValidator } from '../misc/id-validator'
import { TLParentId, TLShapeId } from '../records/TLShape'
import { StyleProp, StylePropInstances, isStyleProp } from '../styles/StyleProp'

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
	opacity: TLOpacityType
	props: Props
}

/** @public */
export const parentIdValidator = T.string.refine((id) => {
	if (!id.startsWith('page:') && !id.startsWith('shape:')) {
		throw new Error('Parent ID must start with "page:" or "shape:"')
	}
	return id as TLParentId
})

/** @public */
export const shapeIdValidator = idValidator<TLShapeId>('shape')

/** @internal */
export function createShapeValidator<Type extends string, Props extends object>(
	type: Type,
	props: { [K in keyof Props]: ShapeDefProp<Props[K]> } | undefined,
	styleInstances: StylePropInstances
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
		opacity: opacityValidator,
		props: props
			? T.object(
					mapObjectMapValues(props, (_, prop) =>
						isStyleProp(prop)
							? assertExists(styleInstances.stylePropsByConstructor.get(prop))
							: (prop as T.Validatable<any>)
					)
			  )
			: T.unknownObject,
	})
}

export type ShapeDefProp<T> = T.Validatable<T> | StyleProp<T>

/** @public */
export type ShapeProps<Shape extends TLBaseShape<any, any>> = {
	[K in keyof Shape['props']]: ShapeDefProp<Shape['props'][K]>
}

export type ShapePropsType<Config extends Record<string, ShapeDefProp<any>>> = Expand<{
	[K in keyof Config]: Config[K] extends ShapeDefProp<infer U> ? U : never
}>
