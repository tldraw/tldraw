import { LegacyMigrations, MigrationSequence, StoreSchema, StoreValidator } from '@tldraw/store'
import { hasOwnProperty, objectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
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
import { StyleProp, StyleProp2, StylePropMarker, isStyleProp2 } from './styles/StyleProp'
import { DefaultSizeStyle } from './styles/TLSizeStyle'

/** @public */
export interface SchemaPropsInfo {
	migrations?: LegacyMigrations | TLPropsMigrations | MigrationSequence
	props?: Record<string, StoreValidator<any> | StyleProp2<any>>
	meta?: Record<string, StoreValidator<any>>
}

/** @public */
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
} satisfies { [T in TLDefaultShape['type']]: SchemaPropsInfo }

/** @public */
export const defaultBindingSchemas = {
	arrow: { migrations: arrowBindingMigrations, props: arrowBindingProps },
} satisfies { [T in TLDefaultBinding['type']]: SchemaPropsInfo }

/** @public */
export const defaultStyleSchemas = {
	'tldraw:size': { validator: DefaultSizeStyle },
} satisfies Record<string, { validator: T.Validatable<any> }>

/**
 * Create a TLSchema with custom shapes. Custom shapes cannot override default shapes.
 *
 * @param opts - Options
 *
 * @public */
export function createTLSchema({
	shapes = defaultShapeSchemas,
	bindings = defaultBindingSchemas,
	styles = defaultStyleSchemas,
	migrations,
}: {
	shapes?: Record<string, SchemaPropsInfo>
	bindings?: Record<string, SchemaPropsInfo>
	styles?: Record<string, { validator: T.Validatable<any> }>
	migrations?: readonly MigrationSequence[]
} = {}): TLSchema {
	const stylesById = new Map<string, StyleProp<unknown> | T.Validatable<string>>()
	for (const shape of objectMapValues(shapes)) {
		for (const style of getShapePropKeysByStyle(shape.props ?? {}).keys()) {
			const styleId = style instanceof StyleProp ? style.id : style[StylePropMarker]
			if (stylesById.has(styleId) && stylesById.get(styleId) !== style) {
				// throw new Error(`Multiple StyleProp instances with the same id: ${styleId}`)
			}
			if (isStyleProp2(style)) {
				if (!hasOwnProperty(styles, styleId)) {
					throw new Error(`Style prop ${styleId} is not defined in the styles object`)
				}
				stylesById.set(styleId, styles[styleId]!.validator)
			} else {
				stylesById.set(styleId, style)
			}
		}
	}

	const ShapeRecordType = createShapeRecordType(shapes, styles)
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
