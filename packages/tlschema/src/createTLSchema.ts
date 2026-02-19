import { LegacyMigrations, MigrationSequence, StoreSchema, StoreValidator } from '@tldraw/store'
import { objectMapValues } from '@tldraw/utils'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
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

/**
 * Configuration information for a schema type (shape, binding, or asset), including its properties,
 * metadata, and migration sequences for data evolution over time.
 *
 * @public
 */
export interface SchemaPropsInfo {
	migrations?: LegacyMigrations | TLPropsMigrations | MigrationSequence
	props?: Record<string, StoreValidator<any>>
	meta?: Record<string, StoreValidator<any>>
}

/**
 * The complete schema definition for a tldraw store.
 *
 * @public
 */
export type TLSchema = StoreSchema<TLRecord, TLStoreProps>

/** @public */
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

/** @public */
export const defaultBindingSchemas = {
	arrow: { migrations: arrowBindingMigrations, props: arrowBindingProps },
} satisfies { [T in TLDefaultBinding['type']]: SchemaPropsInfo }

/**
 * Default asset schema configurations for all built-in tldraw asset types.
 *
 * @public
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
 * Creates a complete TLSchema for use with tldraw stores.
 *
 * @public
 */
export function createTLSchema({
	shapes = defaultShapeSchemas,
	bindings = defaultBindingSchemas,
	assets = defaultAssetSchemas,
	migrations,
}: {
	shapes?: Record<string, SchemaPropsInfo>
	bindings?: Record<string, SchemaPropsInfo>
	assets?: Record<string, SchemaPropsInfo>
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

				...processPropsMigrations<TLUnknownAsset>('asset', assets),
				...processPropsMigrations<TLShape>('shape', shapes),
				...processPropsMigrations<TLBinding>('binding', bindings),

				...(migrations ?? []),
			],
			onValidationFailure,
			createIntegrityChecker,
		}
	)
}
