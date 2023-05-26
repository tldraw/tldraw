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
import { TLShape, rootShapeTypeMigrations } from './records/TLShape'
import { UserDocumentRecordType } from './records/TLUserDocument'
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
import { storeMigrations } from './storeMigrations'

/** @public */
export type TLSchemaShapeInfo = {
	migrations?: Migrations
	validator?: { validate: (record: any) => any }
}

const defaultShapes = {
	arrow: {
		migrations: arrowShapeTypeMigrations,
		validator: arrowShapeTypeValidator,
	},
	bookmark: {
		migrations: bookmarkShapeTypeMigrations,
		validator: bookmarkShapeTypeValidator,
	},
	draw: {
		migrations: drawShapeTypeMigrations,
		validator: drawShapeTypeValidator,
	},
	embed: {
		migrations: embedShapeTypeMigrations,
		validator: embedShapeTypeValidator,
	},
	frame: {
		migrations: frameShapeTypeMigrations,
		validator: frameShapeTypeValidator,
	},
	geo: {
		migrations: geoShapeTypeMigrations,
		validator: geoShapeTypeValidator,
	},
	group: {
		migrations: groupShapeTypeMigrations,
		validator: groupShapeTypeValidator,
	},
	image: {
		migrations: imageShapeTypeMigrations,
		validator: imageShapeTypeValidator,
	},
	line: {
		migrations: lineShapeTypeMigrations,
		validator: lineShapeTypeValidator,
	},
	note: {
		migrations: noteShapeTypeMigrations,
		validator: noteShapeTypeValidator,
	},
	text: {
		migrations: textShapeTypeMigrations,
		validator: textShapeTypeValidator,
	},
	video: {
		migrations: videoShapeTypeMigrations,
		validator: videoShapeTypeValidator,
	},
}

/**
 from* Create a store schema with the given migrators and validator.
 *
 *  @public */
export function createTLSchema({ shapes }: { shapes: Record<string, TLSchemaShapeInfo> }) {
	for (const key in shapes) {
		if (key in defaultShapes) {
			throw Error(`Can't override default shape ${key}!`)
		}
	}

	const allShapeEntries = Object.entries({ ...shapes, ...defaultShapes })

	const ShapeRecordType = createRecordType<TLShape>('shape', {
		migrations: defineMigrations({
			currentVersion: rootShapeTypeMigrations.currentVersion,
			firstVersion: rootShapeTypeMigrations.firstVersion,
			migrators: rootShapeTypeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: {
				...Object.fromEntries(
					allShapeEntries.map(([k, v]) => [k, v.migrations ?? defineMigrations({})])
				),
			},
		}),
		scope: 'document',
		validator: T.model(
			'shape',
			T.union('type', {
				...Object.fromEntries(
					allShapeEntries.map(([k, v]) => [k, (v.validator as T.Validator<any>) ?? T.any])
				),
			})
		),
	}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
			asset: AssetRecordType,
			camera: CameraRecordType,
			document: DocumentRecordType,
			instance: InstanceRecordType,
			instance_page_state: InstancePageStateRecordType,
			page: PageRecordType,
			shape: ShapeRecordType,
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
