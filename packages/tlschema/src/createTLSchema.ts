import { LegacyMigrations, MigrationSequence, StoreSchema, StoreValidator } from '@tldraw/store'
import { objectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { TLBaseAsset } from './assets/TLBaseAsset'
import { bookmarkAssetMigrations, bookmarkAssetProps } from './assets/TLBookmarkAsset'
import { imageAssetMigrations, imageAssetProps } from './assets/TLImageAsset'
import { videoAssetMigrations, videoAssetProps } from './assets/TLVideoAsset'
import { arrowBindingMigrations, arrowBindingProps } from './bindings/TLArrowBinding'
import {
	TLDefaultAsset,
	TLUnknownAsset,
	assetMigrations,
	createAssetRecordType,
} from './records/TLAsset'
import { TLBinding, TLDefaultBinding, createBindingRecordType } from './records/TLBinding'
import { CameraRecordType, cameraMigrations } from './records/TLCamera'
import {
	CustomRecordInfo,
	createCustomRecordType,
	processCustomRecordMigrations,
} from './records/TLCustomRecord'
import { DocumentRecordType, documentMigrations } from './records/TLDocument'
import { createInstanceRecordType, instanceMigrations } from './records/TLInstance'
import { PageRecordType, pageMigrations } from './records/TLPage'
import { InstancePageStateRecordType, instancePageStateMigrations } from './records/TLPageState'
import { PointerRecordType, pointerMigrations } from './records/TLPointer'
import { InstancePresenceRecordType, instancePresenceMigrations } from './records/TLPresence'
import { TLRecord } from './records/TLRecord'
import {
	TLDefaultShape,
	TLShape,
	createShapeRecordType,
	getShapePropKeysByStyle,
	rootShapeMigrations,
} from './records/TLShape'
import { UserRecordType, createUserRecordType, userMigrations } from './records/TLUser'
import { RecordProps, TLPropsMigrations, processPropsMigrations } from './recordsWithProps'
import { arrowShapeMigrations, arrowShapeProps } from './shapes/TLArrowShape'
import { TLBaseShape } from './shapes/TLBaseShape'
import { bookmarkShapeMigrations, bookmarkShapeProps } from './shapes/TLBookmarkShape'
import { drawShapeMigrations, drawShapeProps } from './shapes/TLDrawShape'
import { embedShapeMigrations, embedShapeProps } from './shapes/TLEmbedShape'
import { frameShapeMigrations, frameShapeProps } from './shapes/TLFrameShape'
import { geoShapeMigrations, geoShapeProps } from './shapes/TLGeoShape'
import { groupShapeMigrations, groupShapeProps } from './shapes/TLGroupShape'
import { highlightShapeMigrations, highlightShapeProps } from './shapes/TLHighlightShape'
import { imageShapeMigrations, imageShapeProps } from './shapes/TLImageShape'
import { lineShapeMigrations, lineShapeProps } from './shapes/TLLineShape'
import { noteShapeMigrations, noteShapeProps } from './shapes/TLNoteShape'
import { textShapeMigrations, textShapeProps } from './shapes/TLTextShape'
import { videoShapeMigrations, videoShapeProps } from './shapes/TLVideoShape'
import { storeMigrations } from './store-migrations'
import { StyleProp } from './styles/StyleProp'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'

/**
 * Configuration information for a schema type (shape, binding, or asset), including its properties,
 * metadata, and migration sequences for data evolution over time.
 *
 * @public
 * @example
 * ```ts
 * import { arrowShapeMigrations, arrowShapeProps } from './shapes/TLArrowShape'
 *
 * const myShapeSchema: SchemaPropsInfo = {
 *   migrations: arrowShapeMigrations,
 *   props: arrowShapeProps,
 *   meta: {
 *     customField: T.string,
 *   },
 * }
 * ```
 */
export interface SchemaPropsInfo {
	/**
	 * Migration sequences for handling data evolution over time. Can be legacy migrations,
	 * props-specific migrations, or general migration sequences.
	 */
	migrations?: LegacyMigrations | TLPropsMigrations | MigrationSequence

	/**
	 * Validation schema for the shape, binding, or asset properties.
	 */
	props?: Record<string, StoreValidator<any>>

	/**
	 * Validation schema for metadata fields.
	 */
	meta?: Record<string, StoreValidator<any>>
}

/**
 * The complete schema definition for a tldraw store, encompassing all record types,
 * validation rules, and migration sequences. This schema defines the structure of
 * the persistent data model used by tldraw.
 *
 * @public
 * @example
 * ```ts
 * import { createTLSchema, defaultShapeSchemas } from '@tldraw/tlschema'
 * import { Store } from '@tldraw/store'
 *
 * const schema: TLSchema = createTLSchema({
 *   shapes: defaultShapeSchemas,
 * })
 *
 * const store = new Store({ schema })
 * ```
 */
export type TLSchema = StoreSchema<TLRecord, TLStoreProps>

/**
 * Default shape schema configurations for all built-in tldraw shape types.
 * Each shape type includes its validation props and migration sequences.
 *
 * This object contains schema information for:
 * - arrow: Directional lines that can bind to other shapes
 * - bookmark: Website bookmark cards with preview information
 * - draw: Freehand drawing paths created with drawing tools
 * - embed: Embedded content from external services (YouTube, Figma, etc.)
 * - frame: Container shapes for organizing content
 * - geo: Geometric shapes (rectangles, ellipses, triangles, etc.)
 * - group: Logical groupings of multiple shapes
 * - highlight: Highlighting strokes from the highlighter tool
 * - image: Raster image shapes referencing image assets
 * - line: Multi-point lines and splines
 * - note: Sticky note shapes with text content
 * - text: Rich text shapes with formatting support
 * - video: Video shapes referencing video assets
 *
 * @public
 * @example
 * ```ts
 * import { createTLSchema, defaultShapeSchemas } from '@tldraw/tlschema'
 *
 * // Use all default shapes
 * const schema = createTLSchema({
 *   shapes: defaultShapeSchemas,
 * })
 *
 * // Use only specific default shapes
 * const minimalSchema = createTLSchema({
 *   shapes: {
 *     geo: defaultShapeSchemas.geo,
 *     text: defaultShapeSchemas.text,
 *   },
 * })
 * ```
 */
export const defaultShapeSchemas = {
	arrow: { migrations: arrowShapeMigrations, props: arrowShapeProps },
	bookmark: { migrations: bookmarkShapeMigrations, props: bookmarkShapeProps },
	draw: { migrations: drawShapeMigrations, props: drawShapeProps },
	embed: { migrations: embedShapeMigrations, props: embedShapeProps },
	frame: { migrations: frameShapeMigrations, props: frameShapeProps },
	geo: { migrations: geoShapeMigrations, props: geoShapeProps },
	group: { migrations: groupShapeMigrations, props: groupShapeProps },
	highlight: { migrations: highlightShapeMigrations, props: highlightShapeProps },
	image: { migrations: imageShapeMigrations, props: imageShapeProps },
	line: { migrations: lineShapeMigrations, props: lineShapeProps },
	note: { migrations: noteShapeMigrations, props: noteShapeProps },
	text: { migrations: textShapeMigrations, props: textShapeProps },
	video: { migrations: videoShapeMigrations, props: videoShapeProps },
} satisfies {
	[T in TLDefaultShape['type']]: {
		migrations: SchemaPropsInfo['migrations']
		props: RecordProps<TLBaseShape<T, Extract<TLDefaultShape, { type: T }>['props']>>
	}
}

/**
 * Default binding schema configurations for all built-in tldraw binding types.
 * Bindings represent relationships between shapes, such as arrows connected to shapes.
 *
 * Currently includes:
 * - arrow: Bindings that connect arrow shapes to other shapes at specific anchor points
 *
 * @public
 * @example
 * ```ts
 * import { createTLSchema, defaultBindingSchemas } from '@tldraw/tlschema'
 *
 * // Use default bindings
 * const schema = createTLSchema({
 *   bindings: defaultBindingSchemas,
 * })
 *
 * // Add custom binding alongside defaults
 * const customSchema = createTLSchema({
 *   bindings: {
 *     ...defaultBindingSchemas,
 *     myCustomBinding: {
 *       props: myCustomBindingProps,
 *       migrations: myCustomBindingMigrations,
 *     },
 *   },
 * })
 * ```
 */
export const defaultBindingSchemas = {
	arrow: { migrations: arrowBindingMigrations, props: arrowBindingProps },
} satisfies { [T in TLDefaultBinding['type']]: SchemaPropsInfo }

/**
 * Default asset schema configurations for all built-in tldraw asset types.
 *
 * @public
 * @example
 * ```ts
 * import { createTLSchema, defaultAssetSchemas } from '@tldraw/tlschema'
 *
 * const schema = createTLSchema({
 *   assets: defaultAssetSchemas,
 * })
 * ```
 */
export const defaultAssetSchemas = {
	image: { migrations: imageAssetMigrations, props: imageAssetProps },
	video: { migrations: videoAssetMigrations, props: videoAssetProps },
	bookmark: { migrations: bookmarkAssetMigrations, props: bookmarkAssetProps },
} satisfies {
	[T in TLDefaultAsset['type']]: {
		migrations: SchemaPropsInfo['migrations']
		props: RecordProps<TLBaseAsset<T, Extract<TLDefaultAsset, { type: T }>['props']>>
	}
}

/**
 * Configuration for extending the user record type with custom metadata
 * validators and migration sequences.
 *
 * @example
 * ```ts
 * import { T } from '@tldraw/validate'
 *
 * const userSchema: UserSchemaInfo = {
 *   meta: {
 *     isAdmin: T.boolean,
 *     department: T.string,
 *   },
 * }
 * ```
 *
 * @public
 */
export interface UserSchemaInfo {
	/**
	 * Validators for custom metadata fields on user records. Each field is
	 * treated as optional — user records without these fields remain valid,
	 * but when present, values are validated against the provided validators.
	 */
	meta?: Record<string, T.Validatable<any>>

	/**
	 * Additional migration sequences for evolving custom user data over time.
	 */
	migrations?: readonly MigrationSequence[]
}

/**
 * Creates a complete TLSchema for use with tldraw stores. This schema defines the structure,
 * validation, and migration sequences for all record types in a tldraw application.
 *
 * The schema includes all core record types (pages, cameras, instances, etc.) plus the
 * shape, binding, asset, and custom record types you specify. Style properties are
 * automatically collected from all shapes to ensure consistency across the application.
 *
 * @param options - Configuration options for the schema
 *   - shapes - Shape schema configurations. Defaults to defaultShapeSchemas if not provided
 *   - bindings - Binding schema configurations. Defaults to defaultBindingSchemas if not provided
 *   - assets - Asset schema configurations. Defaults to defaultAssetSchemas if not provided
 *   - user - Custom user record configuration with meta validators and migrations
 *   - records - Custom record type configurations. These are additional record types beyond
 *     the built-in shapes, bindings, assets, etc.
 *   - migrations - Additional migration sequences to include in the schema
 * @returns A complete TLSchema ready for use with Store creation
 *
 * @public
 * @example
 * ```ts
 * import {
 *   createTLSchema,
 *   defaultShapeSchemas,
 *   defaultBindingSchemas,
 *   defaultAssetSchemas,
 * } from '@tldraw/tlschema'
 * import { Store } from '@tldraw/store'
 *
 * // Create schema with all default shapes, bindings, and assets
 * const schema = createTLSchema()
 *
 * // Create schema with custom shapes added
 * const customSchema = createTLSchema({
 *   shapes: {
 *     ...defaultShapeSchemas,
 *     myCustomShape: {
 *       props: myCustomShapeProps,
 *       migrations: myCustomShapeMigrations,
 *     },
 *   },
 *   bindings: defaultBindingSchemas,
 *   assets: defaultAssetSchemas,
 * })
 *
 * // Create schema with custom user metadata
 * const schemaWithCustomUser = createTLSchema({
 *   user: {
 *     meta: {
 *       isAdmin: T.boolean,
 *       department: T.string,
 *     },
 *   },
 * })
 *
 * // Create schema with custom record types
 * const schemaWithCustomRecords = createTLSchema({
 *   records: {
 *     comment: {
 *       scope: 'document',
 *       validator: T.object({
 *         id: T.string,
 *         typeName: T.literal('comment'),
 *         text: T.string,
 *         shapeId: T.string,
 *       }),
 *     },
 *   },
 * })
 *
 * // Use the schema with a store
 * const store = new Store({
 *   schema: customSchema,
 *   props: {
 *     defaultName: 'My Drawing',
 *   },
 * })
 * ```
 */
export function createTLSchema({
	shapes = defaultShapeSchemas,
	bindings = defaultBindingSchemas,
	assets = defaultAssetSchemas,
	user,
	records = {},
	migrations,
}: {
	shapes?: Record<string, SchemaPropsInfo>
	bindings?: Record<string, SchemaPropsInfo>
	assets?: Record<string, SchemaPropsInfo>
	user?: UserSchemaInfo
	records?: Record<string, CustomRecordInfo>
	migrations?: readonly MigrationSequence[]
} = {}): TLSchema {
	const stylesById = new Map<string, StyleProp<unknown>>()
	for (const shape of objectMapValues(shapes)) {
		for (const style of getShapePropKeysByStyle(shape.props ?? {}).keys()) {
			if (stylesById.has(style.id) && stylesById.get(style.id) !== style) {
				throw new Error(`Multiple StyleProp instances with the same id: ${style.id}`)
			}
			stylesById.set(style.id, style)
		}
	}

	const ShapeRecordType = createShapeRecordType(shapes)
	const BindingRecordType = createBindingRecordType(bindings)
	const _AssetRecordType = createAssetRecordType(assets)
	const InstanceRecordType = createInstanceRecordType(stylesById)
	const CustomUserRecordType = user ? createUserRecordType(user) : UserRecordType

	// Create RecordTypes for custom records
	const builtInTypeNames = new Set([
		'asset',
		'binding',
		'camera',
		'document',
		'instance',
		'instance_page_state',
		'page',
		'instance_presence',
		'pointer',
		'shape',
		'store',
		'user',
	])
	const customRecordTypes: Record<string, { createId: any }> = {}
	for (const [typeName, config] of Object.entries(records)) {
		if (builtInTypeNames.has(typeName)) {
			throw new Error(
				`Custom record type name '${typeName}' conflicts with tldraw's built-in record type of that name. Choose a different name instead.`
			)
		}
		customRecordTypes[typeName] = createCustomRecordType(typeName, config)
	}

	return StoreSchema.create(
		{
			asset: _AssetRecordType,
			binding: BindingRecordType,
			camera: CameraRecordType,
			document: DocumentRecordType,
			instance: InstanceRecordType,
			instance_page_state: InstancePageStateRecordType,
			page: PageRecordType,
			instance_presence: InstancePresenceRecordType,
			pointer: PointerRecordType,
			shape: ShapeRecordType,
			user: CustomUserRecordType,
			...customRecordTypes,
		},
		{
			migrations: [
				storeMigrations,
				assetMigrations,
				cameraMigrations,
				documentMigrations,
				instanceMigrations,
				instancePageStateMigrations,
				pageMigrations,
				instancePresenceMigrations,
				pointerMigrations,
				rootShapeMigrations,

				userMigrations,

				...processPropsMigrations<TLUnknownAsset>('asset', assets),
				...processPropsMigrations<TLShape>('shape', shapes),
				...processPropsMigrations<TLBinding>('binding', bindings),
				...processCustomRecordMigrations(records),

				...(user?.migrations ?? []),
				...(migrations ?? []),
			],
			onValidationFailure,
			createIntegrityChecker,
		}
	)
}
