import { LegacyMigrator, MigrationOptions, Migrations, StoreSchema } from '@tldraw/store'
import { objectMapValues } from '@tldraw/utils'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import {
	arrowShapeMigrations,
	assetMigrations,
	bookmarkShapeMigrations,
	cameraMigrations,
	documentMigrations,
	drawShapeMigrations,
	embedShapeMigrations,
	frameShapeMigrations,
	geoShapeMigrations,
	groupShapeMigrations,
	highlightShapeMigrations,
	imageShapeMigrations,
	instanceMigrations,
	instancePageStateMigrations,
	instancePresenceMigrations,
	lineShapeMigrations,
	noteShapeMigrations,
	pageMigrations,
	pointerMigrations,
	storeMigrations,
	textShapeMigrations,
	videoShapeMigrations,
} from './legacy-migrations/legacy-migrations'
import { tldrawMigrations } from './migrations/tldrawMigrations'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { createInstanceRecordType } from './records/TLInstance'
import { PageRecordType } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { PointerRecordType } from './records/TLPointer'
import { InstancePresenceRecordType } from './records/TLPresence'
import { TLRecord } from './records/TLRecord'
import { TLDefaultShape, createShapeRecordType, getShapePropKeysByStyle } from './records/TLShape'
import { arrowShapeProps } from './shapes/TLArrowShape'
import { bookmarkShapeProps } from './shapes/TLBookmarkShape'
import { drawShapeProps } from './shapes/TLDrawShape'
import { embedShapeProps } from './shapes/TLEmbedShape'
import { frameShapeProps } from './shapes/TLFrameShape'
import { geoShapeProps } from './shapes/TLGeoShape'
import { groupShapeProps } from './shapes/TLGroupShape'
import { highlightShapeProps } from './shapes/TLHighlightShape'
import { imageShapeProps } from './shapes/TLImageShape'
import { lineShapeProps } from './shapes/TLLineShape'
import { noteShapeProps } from './shapes/TLNoteShape'
import { textShapeProps } from './shapes/TLTextShape'
import { videoShapeProps } from './shapes/TLVideoShape'
import { StyleProp } from './styles/StyleProp'

/** @public */
export type SchemaShapeInfo = {
	// eslint-disable-next-line deprecation/deprecation
	__legacyMigrations_do_not_update?: Migrations
	// TODO: add link to docs
	/**
	 * The way to specify migrations has changed. Please refer to [docs]
	 * @deprecated - The way to specify migrations has changed. Please refer to [docs]
	 */
	migrations?: never
	props?: Record<string, { validate: (prop: any) => any }>
	meta?: Record<string, { validate: (prop: any) => any }>
}

/** @public */
export type TLSchema = StoreSchema<TLRecord, TLStoreProps>

/**
 * Create a TLSchema with custom shapes. Custom shapes cannot override default shapes.
 *
 * @param opts - Options
 *
 * @public */
export function createTLSchema({
	shapes = defaultShapes,
	migrations,
}: {
	shapes?: Record<string, SchemaShapeInfo>
	migrations?: MigrationOptions
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

	const { ShapeRecordType, legacyShapeMigrations } = createShapeRecordType(shapes)
	const InstanceRecordType = createInstanceRecordType(stylesById)

	const __legacyMigrator = new LegacyMigrator(
		{
			asset: assetMigrations,
			camera: cameraMigrations,
			document: documentMigrations,
			instance: instanceMigrations,
			instance_page_state: instancePageStateMigrations,
			page: pageMigrations,
			shape: legacyShapeMigrations,
			instance_presence: instancePresenceMigrations,
			pointer: pointerMigrations,
		},
		storeMigrations
	)

	return StoreSchema.create(
		{
			asset: AssetRecordType,
			camera: CameraRecordType,
			document: DocumentRecordType,
			instance: InstanceRecordType,
			instance_page_state: InstancePageStateRecordType,
			page: PageRecordType,
			shape: ShapeRecordType,
			instance_presence: InstancePresenceRecordType,
			pointer: PointerRecordType,
		},
		{
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			__legacyMigrator,
			migrations: migrations ?? {
				sequences: [{ sequence: tldrawMigrations, versionAtInstallation: 'root' }],
				// DO NOT DO THIS (mapping over migrations to get the id ordering) IN USERLAND CODE
				// Doing this when you use your own migrations or 3rd party migrations is not safe.
				// You should always specify the order manually with an explicit array of migration IDs.
				order: tldrawMigrations.migrations.map((m) => m.id),
			},
		}
	)
}

const defaultShapes = {
	group: {
		props: groupShapeProps,
		__legacyMigrations_do_not_update: groupShapeMigrations,
	},
	text: {
		props: textShapeProps,
		__legacyMigrations_do_not_update: textShapeMigrations,
	},
	bookmark: {
		props: bookmarkShapeProps,
		__legacyMigrations_do_not_update: bookmarkShapeMigrations,
	},
	draw: {
		props: drawShapeProps,
		__legacyMigrations_do_not_update: drawShapeMigrations,
	},
	geo: {
		props: geoShapeProps,
		__legacyMigrations_do_not_update: geoShapeMigrations,
	},
	note: {
		props: noteShapeProps,
		__legacyMigrations_do_not_update: noteShapeMigrations,
	},
	line: {
		props: lineShapeProps,
		__legacyMigrations_do_not_update: lineShapeMigrations,
	},
	frame: {
		props: frameShapeProps,
		__legacyMigrations_do_not_update: frameShapeMigrations,
	},
	arrow: {
		props: arrowShapeProps,
		__legacyMigrations_do_not_update: arrowShapeMigrations,
	},
	highlight: {
		props: highlightShapeProps,
		__legacyMigrations_do_not_update: highlightShapeMigrations,
	},
	embed: {
		props: embedShapeProps,
		__legacyMigrations_do_not_update: embedShapeMigrations,
	},
	image: {
		props: imageShapeProps,
		__legacyMigrations_do_not_update: imageShapeMigrations,
	},
	video: {
		props: videoShapeProps,
		__legacyMigrations_do_not_update: videoShapeMigrations,
	},
} satisfies { [k in TLDefaultShape['type']]: SchemaShapeInfo }
