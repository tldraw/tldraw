import { Migrations, StoreSchema, createRecordType, defineMigrations } from '@tldraw/tlstore'
import { TLRecord } from './TLRecord'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { defaultTldrawEditorValidator } from './defaultTldrawEditorValidator'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { InstanceRecordType } from './records/TLInstance'
import { InstancePageStateRecordType } from './records/TLInstancePageState'
import { InstancePresenceRecordType } from './records/TLInstancePresence'
import { PageRecordType } from './records/TLPage'
import { PointerRecordType } from './records/TLPointer'
import { TLShape, rootShapeTypeMigrations } from './records/TLShape'
import { UserDocumentRecordType } from './records/TLUserDocument'
import { storeMigrations } from './schema'
import { arrowShapeTypeMigrations } from './shapes/TLArrowShape'
import { bookmarkShapeTypeMigrations } from './shapes/TLBookmarkShape'
import { drawShapeTypeMigrations } from './shapes/TLDrawShape'
import { embedShapeTypeMigrations } from './shapes/TLEmbedShape'
import { frameShapeTypeMigrations } from './shapes/TLFrameShape'
import { geoShapeTypeMigrations } from './shapes/TLGeoShape'
import { groupShapeTypeMigrations } from './shapes/TLGroupShape'
import { imageShapeTypeMigrations } from './shapes/TLImageShape'
import { lineShapeTypeMigrations } from './shapes/TLLineShape'
import { noteShapeTypeMigrations } from './shapes/TLNoteShape'
import { textShapeTypeMigrations } from './shapes/TLTextShape'
import { videoShapeTypeMigrations } from './shapes/TLVideoShape'

type DefaultShapeInfo = {
	migrations: Migrations
}

const DEFAULT_SHAPES: { [K in TLShape['type']]: DefaultShapeInfo } = {
	arrow: { migrations: arrowShapeTypeMigrations },
	bookmark: { migrations: bookmarkShapeTypeMigrations },
	draw: { migrations: drawShapeTypeMigrations },
	embed: { migrations: embedShapeTypeMigrations },
	frame: { migrations: frameShapeTypeMigrations },
	geo: { migrations: geoShapeTypeMigrations },
	group: { migrations: groupShapeTypeMigrations },
	image: { migrations: imageShapeTypeMigrations },
	line: { migrations: lineShapeTypeMigrations },
	note: { migrations: noteShapeTypeMigrations },
	text: { migrations: textShapeTypeMigrations },
	video: { migrations: videoShapeTypeMigrations },
}

type CustomShapeInfo = {
	migrations?: Migrations
}

/**
 * Create a store schema for a tldraw store that includes all the default shapes together with any custom shapes.
 *  @public */
export function createTLSchema(
	opts = {} as {
		customShapes?: { [key: string]: CustomShapeInfo }
		validator?: { validate: (r: any) => any }
	}
) {
	const { validator, customShapes = {} } = opts

	const defaultShapeSubTypeEntries = Object.entries(DEFAULT_SHAPES) as [
		TLShape['type'],
		DefaultShapeInfo
	][]

	const customShapeSubTypeEntries = Object.entries(customShapes) as [string, CustomShapeInfo][]

	// Create a shape record that incorporates the default shapes and any custom shapes
	// into its subtype migrations and validators, so that we can migrate any new custom
	// subtypes. Note that migrations AND validators for custom shapes are optional. If
	// not provided, we use an empty migrations set and/or an "any" validator.

	const shapeSubTypeMigrationsWithCustomSubTypeMigrations = {
		...Object.fromEntries(defaultShapeSubTypeEntries.map(([k, v]) => [k, v.migrations])),
		...Object.fromEntries(
			customShapeSubTypeEntries.map(([k, v]) => [k, v.migrations ?? defineMigrations({})])
		),
	}

	const shapeRecord = createRecordType<TLShape>('shape', {
		migrations: defineMigrations({
			currentVersion: rootShapeTypeMigrations.currentVersion,
			firstVersion: rootShapeTypeMigrations.firstVersion,
			migrators: rootShapeTypeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: shapeSubTypeMigrationsWithCustomSubTypeMigrations,
		}),
		scope: 'document',
	}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
			asset: AssetRecordType,
			camera: CameraRecordType,
			document: DocumentRecordType,
			instance: InstanceRecordType,
			instance_page_state: InstancePageStateRecordType,
			page: PageRecordType,
			shape: shapeRecord,
			user_document: UserDocumentRecordType,
			instance_presence: InstancePresenceRecordType,
			pointer: PointerRecordType,
		},
		{
			snapshotMigrations: storeMigrations,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			validator: validator ?? defaultTldrawEditorValidator,
		}
	)
}
