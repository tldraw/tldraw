import { LegacyMigrations, MigrationSequence, StoreSchema } from '@tldraw/store'
import { objectMapValues } from '@tldraw/utils'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { bookmarkAssetMigrations } from './assets/TLBookmarkAsset'
import { imageAssetMigrations } from './assets/TLImageAsset'
import { videoAssetMigrations } from './assets/TLVideoAsset'
import { arrowBindingMigrations, arrowBindingProps } from './bindings/TLArrowBinding'
import { AssetRecordType, assetMigrations } from './records/TLAsset'
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
import { TLPropsMigrations, processPropsMigrations } from './recordsWithProps'
import { arrowShapeMigrations, arrowShapeProps } from './shapes/TLArrowShape'
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

interface AnyValidator {
	validate: (prop: any) => any
	validateUsingKnownGoodVersion?: (prevVersion: any, newVersion: any) => any
}

/** @public */
export interface SchemaPropsInfo {
	migrations?: LegacyMigrations | TLPropsMigrations | MigrationSequence
	props?: Record<string, AnyValidator>
	meta?: Record<string, AnyValidator>
}

/** @public */
export type TLSchema = StoreSchema<TLRecord, TLStoreProps>

/** @public */
export const defaultShapeSchemas: { [T in TLDefaultShape['type']]: SchemaPropsInfo } = {
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
}

/** @public */
export const defaultBindingSchemas: { [T in TLDefaultBinding['type']]: SchemaPropsInfo } = {
	arrow: { migrations: arrowBindingMigrations, props: arrowBindingProps },
}

/**
 * Create a TLSchema with custom shapes. Custom shapes cannot override default shapes.
 *
 * @param opts - Options
 *
 * @public */
export function createTLSchema({
	shapes = defaultShapeSchemas,
	bindings = defaultBindingSchemas,
	migrations,
}: {
	shapes?: Record<string, SchemaPropsInfo>
	bindings?: Record<string, SchemaPropsInfo>
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
	const InstanceRecordType = createInstanceRecordType(stylesById)

	return StoreSchema.create(
		{
			asset: AssetRecordType,
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

				bookmarkAssetMigrations,
				imageAssetMigrations,
				videoAssetMigrations,

				...processPropsMigrations<TLShape>('shape', shapes),
				...processPropsMigrations<TLBinding>('binding', bindings),

				...(migrations ?? []),
			],
			onValidationFailure,
			createIntegrityChecker,
		}
	)
}
