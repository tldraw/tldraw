import { BaseRecord } from '@tldraw/store'
import { hasOwnProperty, IndexKey, JsonObject, mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { opacityValidator, TLOpacityType } from '../misc/TLOpacity'
import { idValidator } from '../misc/id-validator'
import { TLParentId, TLShapeId } from '../records/TLShape'
import { isStyleProp2, StyleProp2, StylePropMarker } from '../styles/StyleProp'

/** @public */
export interface TLBaseShape<Type extends string, Props extends object>
	extends BaseRecord<'shape', TLShapeId> {
	type: Type
	x: number
	y: number
	rotation: number
	index: IndexKey
	parentId: TLParentId
	isLocked: boolean
	opacity: TLOpacityType
	props: Props
	meta: JsonObject
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

/** @public */
export function createShapeValidator<
	Type extends string,
	Props extends JsonObject,
	Meta extends JsonObject,
>(
	type: Type,
	props: { [K in keyof Props]: T.Validatable<Props[K]> | StyleProp2<string> } | undefined,
	meta: { [K in keyof Meta]: T.Validatable<Meta[K]> } | undefined,
	styles: Record<string, { validator: T.Validatable<any> }>
) {
	return T.object<TLBaseShape<Type, Props>>({
		id: shapeIdValidator,
		typeName: T.literal('shape'),
		x: T.number,
		y: T.number,
		rotation: T.number,
		index: T.indexKey,
		parentId: parentIdValidator,
		type: T.literal(type),
		isLocked: T.boolean,
		opacity: opacityValidator,
		props: props
			? T.object(
					mapObjectMapValues(props, (_, value) => {
						if (isStyleProp2(value)) {
							const id = value[StylePropMarker]
							if (!hasOwnProperty(styles, id)) {
								throw new Error(`Style prop ${id} is not defined in the styles object`)
							}
							return styles[id]!.validator
						}
						return value
					})
				)
			: (T.jsonValue as any),
		meta: meta ? T.object(meta) : (T.jsonValue as any),
	})
}
