import {
	RecordId,
	UnknownRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { mapObjectMapValues, uniqueId } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { SchemaPropsInfo } from '../createTLSchema'
import { TLPropsMigrations } from '../recordsWithProps'
import { TLArrowShape } from '../shapes/TLArrowShape'
import { TLBaseShape, createShapeValidator } from '../shapes/TLBaseShape'
import { TLBookmarkShape } from '../shapes/TLBookmarkShape'
import { TLDrawShape } from '../shapes/TLDrawShape'
import { TLEmbedShape } from '../shapes/TLEmbedShape'
import { TLFrameShape } from '../shapes/TLFrameShape'
import { TLGeoShape } from '../shapes/TLGeoShape'
import { TLGroupShape } from '../shapes/TLGroupShape'
import { TLHighlightShape } from '../shapes/TLHighlightShape'
import { TLImageShape } from '../shapes/TLImageShape'
import { TLLineShape } from '../shapes/TLLineShape'
import { TLNoteShape } from '../shapes/TLNoteShape'
import { TLTextShape } from '../shapes/TLTextShape'
import { TLVideoShape } from '../shapes/TLVideoShape'
import { StyleProp } from '../styles/StyleProp'
import { TLPageId } from './TLPage'

/**
 * The default set of shapes that are available in the editor.
 *
 * This union type represents all the built-in shape types supported by tldraw,
 * including arrows, bookmarks, drawings, embeds, frames, geometry shapes,
 * groups, images, lines, notes, text, videos, and highlights.
 *
 * @example
 * ```ts
 * // Check if a shape is a default shape type
 * function isDefaultShape(shape: TLShape): shape is TLDefaultShape {
 *   const defaultTypes = ['arrow', 'bookmark', 'draw', 'embed', 'frame', 'geo', 'group', 'image', 'line', 'note', 'text', 'video', 'highlight']
 *   return defaultTypes.includes(shape.type)
 * }
 * ```
 *
 * @public
 */
export type TLDefaultShape =
	| TLArrowShape
	| TLBookmarkShape
	| TLDrawShape
	| TLEmbedShape
	| TLFrameShape
	| TLGeoShape
	| TLGroupShape
	| TLImageShape
	| TLLineShape
	| TLNoteShape
	| TLTextShape
	| TLVideoShape
	| TLHighlightShape

/**
 * A type for a shape that is available in the editor but whose type is
 * unknown—either one of the editor's default shapes or else a custom shape.
 *
 * This is useful when working with shapes generically without knowing their specific type.
 * The shape type is a string and props are a generic object.
 *
 * @example
 * ```ts
 * // Handle any shape regardless of its specific type
 * function processUnknownShape(shape: TLUnknownShape) {
 *   console.log(`Processing shape of type: ${shape.type}`)
 *   console.log(`Position: (${shape.x}, ${shape.y})`)
 * }
 * ```
 *
 * @public
 */
export type TLUnknownShape = TLBaseShape<string, object>

/**
 * The set of all shapes that are available in the editor, including unknown shapes.
 *
 * This is the primary shape type used throughout tldraw. It includes both the
 * built-in default shapes and any custom shapes that might be added.
 *
 * @example
 * ```ts
 * // Work with any shape in the editor
 * function moveShape(shape: TLShape, deltaX: number, deltaY: number): TLShape {
 *   return {
 *     ...shape,
 *     x: shape.x + deltaX,
 *     y: shape.y + deltaY
 *   }
 * }
 * ```
 *
 * @public
 */
export type TLShape = TLDefaultShape | TLUnknownShape

/**
 * A partial version of a shape, useful for updates and patches.
 *
 * This type represents a shape where all properties except `id` and `type` are optional.
 * It's commonly used when updating existing shapes or creating shape patches.
 *
 * @example
 * ```ts
 * // Update a shape's position
 * const shapeUpdate: TLShapePartial = {
 *   id: 'shape:123',
 *   type: 'geo',
 *   x: 100,
 *   y: 200
 * }
 *
 * // Update shape properties
 * const propsUpdate: TLShapePartial<TLGeoShape> = {
 *   id: 'shape:123',
 *   type: 'geo',
 *   props: {
 *     w: 150,
 *     h: 100
 *   }
 * }
 * ```
 *
 * @public
 */
export type TLShapePartial<T extends TLShape = TLShape> = T extends T
	? {
			id: TLShapeId
			type: T['type']
			props?: Partial<T['props']>
			meta?: Partial<T['meta']>
		} & Partial<Omit<T, 'type' | 'id' | 'props' | 'meta'>>
	: never

/**
 * A unique identifier for a shape record.
 *
 * Shape IDs are branded strings that start with "shape:" followed by a unique identifier.
 * This type-safe approach prevents mixing up different types of record IDs.
 *
 * @example
 * ```ts
 * const shapeId: TLShapeId = createShapeId() // "shape:abc123"
 * const customId: TLShapeId = createShapeId('my-custom-id') // "shape:my-custom-id"
 * ```
 *
 * @public
 */
export type TLShapeId = RecordId<TLUnknownShape>

/**
 * The ID of a shape's parent, which can be either a page or another shape.
 *
 * Shapes can be parented to pages (for top-level shapes) or to other shapes
 * (for shapes inside frames or groups).
 *
 * @example
 * ```ts
 * // Shape parented to a page
 * const pageParentId: TLParentId = 'page:main'
 *
 * // Shape parented to another shape (e.g., inside a frame)
 * const shapeParentId: TLParentId = 'shape:frame123'
 * ```
 *
 * @public
 */
export type TLParentId = TLPageId | TLShapeId

/**
 * Migration version IDs for the root shape schema.
 *
 * These track the evolution of the base shape structure over time, ensuring
 * that shapes created in older versions can be migrated to newer formats.
 *
 * @example
 * ```ts
 * // Check if a migration needs to be applied
 * if (shapeVersion < rootShapeVersions.AddIsLocked) {
 *   // Apply isLocked migration
 * }
 * ```
 *
 * @public
 */
export const rootShapeVersions = createMigrationIds('com.tldraw.shape', {
	AddIsLocked: 1,
	HoistOpacity: 2,
	AddMeta: 3,
	AddWhite: 4,
} as const)

/**
 * Migration sequence for the root shape record type.
 *
 * This sequence defines how shape records should be transformed when migrating
 * between different schema versions. Each migration handles a specific version
 * upgrade, ensuring data compatibility across tldraw versions.
 *
 * @public
 */
export const rootShapeMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.shape',
	recordType: 'shape',
	sequence: [
		{
			id: rootShapeVersions.AddIsLocked,
			up: (record: any) => {
				record.isLocked = false
			},
			down: (record: any) => {
				delete record.isLocked
			},
		},
		{
			id: rootShapeVersions.HoistOpacity,
			up: (record: any) => {
				record.opacity = Number(record.props.opacity ?? '1')
				delete record.props.opacity
			},
			down: (record: any) => {
				const opacity = record.opacity
				delete record.opacity
				record.props.opacity =
					opacity < 0.175
						? '0.1'
						: opacity < 0.375
							? '0.25'
							: opacity < 0.625
								? '0.5'
								: opacity < 0.875
									? '0.75'
									: '1'
			},
		},
		{
			id: rootShapeVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
		},
		{
			id: rootShapeVersions.AddWhite,
			up: (_record) => {
				// noop
			},
			down: (record: any) => {
				if (record.props.color === 'white') {
					record.props.color = 'black'
				}
			},
		},
	],
})

/**
 * Type guard to check if a record is a shape.
 *
 * @param record - The record to check
 * @returns True if the record is a shape, false otherwise
 *
 * @example
 * ```ts
 * const record = store.get('shape:abc123')
 * if (isShape(record)) {
 *   console.log(`Shape type: ${record.type}`)
 *   console.log(`Position: (${record.x}, ${record.y})`)
 * }
 * ```
 *
 * @public
 */
export function isShape(record?: UnknownRecord): record is TLShape {
	if (!record) return false
	return record.typeName === 'shape'
}

/**
 * Type guard to check if a string is a valid shape ID.
 *
 * @param id - The string to check
 * @returns True if the string is a valid shape ID, false otherwise
 *
 * @example
 * ```ts
 * const id = 'shape:abc123'
 * if (isShapeId(id)) {
 *   const shape = store.get(id) // TypeScript knows id is TLShapeId
 * }
 *
 * // Check user input
 * function selectShape(id: string) {
 *   if (isShapeId(id)) {
 *     editor.selectShape(id)
 *   } else {
 *     console.error('Invalid shape ID format')
 *   }
 * }
 * ```
 *
 * @public
 */
export function isShapeId(id?: string): id is TLShapeId {
	if (!id) return false
	return id.startsWith('shape:')
}

/**
 * Creates a new shape ID.
 *
 * @param id - Optional custom ID suffix. If not provided, a unique ID will be generated
 * @returns A new shape ID with the "shape:" prefix
 *
 * @example
 * ```ts
 * // Create a shape with auto-generated ID
 * const shapeId = createShapeId() // "shape:abc123"
 *
 * // Create a shape with custom ID
 * const customShapeId = createShapeId('my-rectangle') // "shape:my-rectangle"
 *
 * // Use in shape creation
 * const newShape: TLGeoShape = {
 *   id: createShapeId(),
 *   type: 'geo',
 *   x: 100,
 *   y: 200,
 *   // ... other properties
 * }
 * ```
 *
 * @public
 */
export function createShapeId(id?: string): TLShapeId {
	return `shape:${id ?? uniqueId()}` as TLShapeId
}

/**
 * Extracts style properties from a shape's props definition and maps them to their property keys.
 *
 * This function analyzes shape property validators to identify which ones are style properties
 * and creates a mapping from StyleProp instances to their corresponding property keys.
 * It also validates that each style property is only used once per shape.
 *
 * @param props - Record of property validators for a shape type
 * @returns Map from StyleProp instances to their property keys
 * @throws Error if a style property is used more than once in the same shape
 *
 * @example
 * ```ts
 * const geoShapeProps = {
 *   color: DefaultColorStyle,
 *   fill: DefaultFillStyle,
 *   width: T.number,
 *   height: T.number
 * }
 *
 * const styleMap = getShapePropKeysByStyle(geoShapeProps)
 * // styleMap.get(DefaultColorStyle) === 'color'
 * // styleMap.get(DefaultFillStyle) === 'fill'
 * ```
 *
 * @internal
 */
export function getShapePropKeysByStyle(props: Record<string, T.Validatable<any>>) {
	const propKeysByStyle = new Map<StyleProp<unknown>, string>()
	for (const [key, prop] of Object.entries(props)) {
		if (prop instanceof StyleProp) {
			if (propKeysByStyle.has(prop)) {
				throw new Error(
					`Duplicate style prop ${prop.id}. Each style prop can only be used once within a shape.`
				)
			}
			propKeysByStyle.set(prop, key)
		}
	}
	return propKeysByStyle
}

/**
 * Creates a migration sequence for shape properties.
 *
 * This is a pass-through function that maintains the same structure as the input.
 * It's used for consistency and to provide a clear API for defining shape property migrations.
 *
 * @param migrations - The migration sequence to create
 * @returns The same migration sequence (pass-through)
 *
 * @example
 * ```ts
 * const myShapeMigrations = createShapePropsMigrationSequence({
 *   sequence: [
 *     {
 *       id: 'com.myapp.shape.custom/1.0.0',
 *       up: (props) => ({ ...props, newProperty: 'default' }),
 *       down: ({ newProperty, ...props }) => props
 *     }
 *   ]
 * })
 * ```
 *
 * @public
 */
export function createShapePropsMigrationSequence(
	migrations: TLPropsMigrations
): TLPropsMigrations {
	return migrations
}

/**
 * Creates properly formatted migration IDs for shape properties.
 *
 * Generates standardized migration IDs following the convention:
 * `com.tldraw.shape.{shapeType}/{version}`
 *
 * @param shapeType - The type of shape these migrations apply to
 * @param ids - Record mapping migration names to version numbers
 * @returns Record with the same keys but formatted migration ID values
 *
 * @example
 * ```ts
 * const myShapeVersions = createShapePropsMigrationIds('custom', {
 *   AddColor: 1,
 *   AddSize: 2,
 *   RefactorProps: 3
 * })
 * // Result: {
 * //   AddColor: 'com.tldraw.shape.custom/1',
 * //   AddSize: 'com.tldraw.shape.custom/2',
 * //   RefactorProps: 'com.tldraw.shape.custom/3'
 * // }
 * ```
 *
 * @public
 */
export function createShapePropsMigrationIds<
	const S extends string,
	const T extends Record<string, number>,
>(shapeType: S, ids: T): { [k in keyof T]: `com.tldraw.shape.${S}/${T[k]}` } {
	return mapObjectMapValues(ids, (_k, v) => `com.tldraw.shape.${shapeType}/${v}`) as any
}

/**
 * Creates the record type definition for shapes.
 *
 * This function generates a complete record type for shapes that includes validation
 * for all registered shape types. It combines the base shape properties with
 * type-specific properties and creates a union validator that can handle any
 * registered shape type.
 *
 * @param shapes - Record of shape type names to their schema configuration
 * @returns A complete RecordType for shapes with proper validation and default properties
 *
 * @example
 * ```ts
 * const shapeRecordType = createShapeRecordType({
 *   geo: { props: geoShapeProps, migrations: geoMigrations },
 *   arrow: { props: arrowShapeProps, migrations: arrowMigrations }
 * })
 * ```
 *
 * @internal
 */
export function createShapeRecordType(shapes: Record<string, SchemaPropsInfo>) {
	return createRecordType<TLShape>('shape', {
		scope: 'document',
		validator: T.model(
			'shape',
			T.union(
				'type',
				mapObjectMapValues(shapes, (type, { props, meta }) =>
					createShapeValidator(type, props, meta)
				)
			)
		),
	}).withDefaultProperties(() => ({
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
	}))
}
