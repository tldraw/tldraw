import { IndexKey, JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { TLOpacityType, opacityValidator } from '../misc/TLOpacity'
import { idValidator } from '../misc/id-validator'
import { TLParentId, TLShapeId } from '../records/TLShape'

/**
 * A snapshot of a user's identity at the time a shape was created or updated.
 * Stored directly in shape data so attribution survives cross-board clipboard paste
 * even when the original collaborator isn't present on the target board.
 *
 * @public
 */
export interface TLAttributionUser {
	readonly id: string
	readonly name: string
}

/** @public */
export const attributionUserValidator: T.Validator<TLAttributionUser | null> =
	T.object<TLAttributionUser>({
		id: T.string,
		name: T.string,
	}).nullable()

/**
 * Attribution metadata tracked internally by tldraw.
 *
 * This metadata is separate from the developer-facing `meta` field and is
 * automatically managed by the editor to track who created and last updated a shape.
 *
 * @public
 */
export interface TLShapeTLmeta {
	createdBy: TLAttributionUser | null
	updatedBy: TLAttributionUser | null
	createdAt: number | null
	updatedAt: number | null
}

/** @public */
export const defaultTlmeta: TLShapeTLmeta = {
	createdBy: null,
	updatedBy: null,
	createdAt: null,
	updatedAt: null,
}

/** @public */
export const tlmetaValidator: T.ObjectValidator<TLShapeTLmeta> = T.object<TLShapeTLmeta>({
	createdBy: attributionUserValidator,
	updatedBy: attributionUserValidator,
	createdAt: T.number.nullable(),
	updatedAt: T.number.nullable(),
})

/**
 * Base interface for all shapes in tldraw.
 *
 * This interface defines the common properties that all shapes share, regardless of their
 * specific type. Every default shape extends this base with additional type-specific properties.
 *
 * Custom shapes should be defined by augmenting the TLGlobalShapePropsMap type and getting the shape type from the TLShape type.
 *
 * @example
 * ```ts
 * // Define a default shape type
 * interface TLArrowShape extends TLBaseShape<'arrow', {
 *   kind: TLArrowShapeKind
 *   labelColor: TLDefaultColorStyle
 *   color: TLDefaultColorStyle
 *   fill: TLDefaultFillStyle
 *   dash: TLDefaultDashStyle
 *   size: TLDefaultSizeStyle
 *   arrowheadStart: TLArrowShapeArrowheadStyle
 *   arrowheadEnd: TLArrowShapeArrowheadStyle
 *   font: TLDefaultFontStyle
 *   start: VecModel
 *   end: VecModel
 *   bend: number
 *   richText: TLRichText
 *   labelPosition: number
 *   scale: number
 *   elbowMidPoint: number
 * }> {}
 *
 * // Create a shape instance
 * const arrowShape: TLArrowShape = {
 *   id: 'shape:abc123',
 *   typeName: 'shape',
 *   type: 'arrow',
 *   x: 100,
 *   y: 200,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     kind: 'arc',
 *     start: { x: 0, y: 0 },
 *     end: { x: 100, y: 100 },
 *     // ... other props
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export interface TLBaseShape<Type extends string, Props extends object> {
	// using real `extends BaseRecord<'shape', TLShapeId>` introduces a circularity in the types
	// and for that reason those "base members" have to be declared manually here
	readonly id: TLShapeId
	readonly typeName: 'shape'

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
	tlmeta: TLShapeTLmeta
}

/**
 * Validator for parent IDs, ensuring they follow the correct format.
 *
 * Parent IDs must start with either "page:" (for shapes directly on a page)
 * or "shape:" (for shapes inside other shapes like frames or groups).
 *
 * @example
 * ```ts
 * // Valid parent IDs
 * const pageParent = parentIdValidator.validate('page:main') // ✓
 * const shapeParent = parentIdValidator.validate('shape:frame1') // ✓
 *
 * // Invalid parent ID (throws error)
 * const invalid = parentIdValidator.validate('invalid:123') // ✗
 * ```
 *
 * @public
 */
export const parentIdValidator = T.string.refine((id) => {
	if (!id.startsWith('page:') && !id.startsWith('shape:')) {
		throw new Error('Parent ID must start with "page:" or "shape:"')
	}
	return id as TLParentId
})

/**
 * Validator for shape IDs, ensuring they follow the "shape:" format.
 *
 * @example
 * ```ts
 * const validId = shapeIdValidator.validate('shape:abc123') // ✓
 * const invalidId = shapeIdValidator.validate('page:abc123') // ✗ throws error
 * ```
 *
 * @public
 */
export const shapeIdValidator = idValidator<TLShapeId>('shape')

/**
 * Creates a validator for a specific shape type.
 *
 * This function generates a complete validator that can validate shape records
 * of the specified type, including both the base shape properties and any
 * custom properties and metadata specific to that shape type.
 *
 * @param type - The string literal type for this shape (e.g., 'geo', 'arrow')
 * @param props - Optional validator configuration for shape-specific properties
 * @param meta - Optional validator configuration for shape-specific metadata
 * @returns A validator that can validate complete shape records of the specified type
 *
 * @example
 * ```ts
 * // Create a validator for a custom shape type
 * const customShapeValidator = createShapeValidator('custom', {
 *   width: T.number,
 *   height: T.number,
 *   color: T.string
 * })
 *
 * // Use the validator to validate shape data
 * const shapeData = {
 *   id: 'shape:abc123',
 *   typeName: 'shape',
 *   type: 'custom',
 *   x: 100,
 *   y: 200,
 *   // ... other base properties
 *   props: {
 *     width: 150,
 *     height: 100,
 *     color: 'red'
 *   }
 * }
 *
 * const validatedShape = customShapeValidator.validate(shapeData)
 * ```
 *
 * @public
 */
export function createShapeValidator<
	Type extends string,
	Props extends JsonObject,
	Meta extends JsonObject,
>(
	type: Type,
	props?: { [K in keyof Props]: T.Validatable<Props[K]> },
	meta?: { [K in keyof Meta]: T.Validatable<Meta[K]> }
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
		props: props ? T.object(props) : (T.jsonValue as any),
		meta: meta ? T.object(meta) : (T.jsonValue as any),
		tlmeta: tlmetaValidator,
	})
}
