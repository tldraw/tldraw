import { Migrations, StoreSchema, createRecordType, defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLRecord } from './TLRecord'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { InstanceRecordType } from './records/TLInstance'
import { InstancePageStateRecordType } from './records/TLInstancePageState'
import { InstancePresenceRecordType } from './records/TLInstancePresence'
import { PageRecordType } from './records/TLPage'
import { PointerRecordType } from './records/TLPointer'
import { TLShape, TLUnknownShape, rootShapeTypeMigrations } from './records/TLShape'
import { UserDocumentRecordType } from './records/TLUserDocument'
import { storeMigrations } from './schema'
import { arrowShapeTypeMigrations, arrowShapeTypeValidator } from './shapes/TLArrowShape'
import { bookmarkShapeTypeMigrations, bookmarkShapeTypeValidator } from './shapes/TLBookmarkShape'
import { drawShapeTypeMigrations, drawShapeTypeValidator } from './shapes/TLDrawShape'
import { embedShapeTypeMigrations, embedShapeTypeValidator } from './shapes/TLEmbedShape'
import { frameShapeTypeMigrations, frameShapeTypeValidator } from './shapes/TLFrameShape'
import { geoShapeTypeMigrations, geoShapeTypeValidator } from './shapes/TLGeoShape'
import { groupShapeTypeMigrations, groupShapeTypeValidator } from './shapes/TLGroupShape'
import { imageShapeTypeMigrations, imageShapeTypeValidator } from './shapes/TLImageShape'
import { lineShapeTypeMigrations, lineShapeTypeValidator } from './shapes/TLLineShape'
import { noteShapeTypeMigrations, noteShapeTypeValidator } from './shapes/TLNoteShape'
import { textShapeTypeMigrations, textShapeTypeValidator } from './shapes/TLTextShape'
import { videoShapeTypeMigrations, videoShapeTypeValidator } from './shapes/TLVideoShape'

type DefaultShapeInfo<T extends TLShape> = {
	validator: T.Validator<T>
	migrations: Migrations
}

const DEFAULT_SHAPES: { [K in TLShape['type']]: DefaultShapeInfo<Extract<TLShape, { type: K }>> } =
	{
		arrow: { migrations: arrowShapeTypeMigrations, validator: arrowShapeTypeValidator },
		bookmark: { migrations: bookmarkShapeTypeMigrations, validator: bookmarkShapeTypeValidator },
		draw: { migrations: drawShapeTypeMigrations, validator: drawShapeTypeValidator },
		embed: { migrations: embedShapeTypeMigrations, validator: embedShapeTypeValidator },
		frame: { migrations: frameShapeTypeMigrations, validator: frameShapeTypeValidator },
		geo: { migrations: geoShapeTypeMigrations, validator: geoShapeTypeValidator },
		group: { migrations: groupShapeTypeMigrations, validator: groupShapeTypeValidator },
		image: { migrations: imageShapeTypeMigrations, validator: imageShapeTypeValidator },
		line: { migrations: lineShapeTypeMigrations, validator: lineShapeTypeValidator },
		note: { migrations: noteShapeTypeMigrations, validator: noteShapeTypeValidator },
		text: { migrations: textShapeTypeMigrations, validator: textShapeTypeValidator },
		video: { migrations: videoShapeTypeMigrations, validator: videoShapeTypeValidator },
	}

type CustomShapeInfo<T extends TLUnknownShape> = {
	validator?: { validate: (record: T) => T }
	migrations?: Migrations
}

/**
 * Create a store schema for a tldraw store that includes all the default shapes together with any custom shapes.
 *  @public */
export function createTLSchema<T extends TLUnknownShape>(
	opts = {} as {
		customShapes?: { [K in T['type']]: CustomShapeInfo<T> }
	}
) {
	const { customShapes = {} } = opts

	const defaultShapeSubTypeEntries = Object.entries(DEFAULT_SHAPES) as [
		TLShape['type'],
		DefaultShapeInfo<TLShape>
	][]

	const customShapeSubTypeEntries = Object.entries(customShapes) as [
		T['type'],
		CustomShapeInfo<T>
	][]

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

	const validatorWithCustomShapeValidators = T.model(
		'shape',
		T.union('type', {
			...Object.fromEntries(defaultShapeSubTypeEntries.map(([k, v]) => [k, v.validator])),
			...Object.fromEntries(
				customShapeSubTypeEntries.map(([k, v]) => [k, (v.validator as T.Validator<any>) ?? T.any])
			),
		})
	)

	const shapeRecord = createRecordType<TLShape>('shape', {
		migrations: defineMigrations({
			currentVersion: rootShapeTypeMigrations.currentVersion,
			firstVersion: rootShapeTypeMigrations.firstVersion,
			migrators: rootShapeTypeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: shapeSubTypeMigrationsWithCustomSubTypeMigrations,
		}),
		validator: validatorWithCustomShapeValidators,
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
		}
	)
}
