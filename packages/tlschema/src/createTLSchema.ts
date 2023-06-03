import { Migrations, StoreSchema, createRecordType, defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLRecord } from './TLRecord'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { InstanceRecordType } from './records/TLInstance'
import { PageRecordType } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { PointerRecordType } from './records/TLPointer'
import { InstancePresenceRecordType } from './records/TLPresence'
import { TLShape, rootShapeTypeMigrations } from './records/TLShape'
import { UserDocumentRecordType } from './records/TLUserDocument'
import { arrowShapeTypeMigrations, arrowShapeTypeValidator } from './shapes/TLArrowShape'
import { bookmarkShapeTypeMigrations, bookmarkShapeTypeValidator } from './shapes/TLBookmarkShape'
import { drawShapeTypeMigrations, drawShapeTypeValidator } from './shapes/TLDrawShape'
import { embedShapeTypeMigrations, embedShapeTypeValidator } from './shapes/TLEmbedShape'
import { frameShapeTypeMigrations, frameShapeTypeValidator } from './shapes/TLFrameShape'
import { geoShapeTypeMigrations, geoShapeTypeValidator } from './shapes/TLGeoShape'
import { groupShapeTypeMigrations, groupShapeTypeValidator } from './shapes/TLGroupShape'
import {
	highlightShapeTypeMigrations,
	highlightShapeTypeValidator,
} from './shapes/TLHighlightShape'
import { imageShapeTypeMigrations, imageShapeTypeValidator } from './shapes/TLImageShape'
import { lineShapeTypeMigrations, lineShapeTypeValidator } from './shapes/TLLineShape'
import { noteShapeTypeMigrations, noteShapeTypeValidator } from './shapes/TLNoteShape'
import { textShapeTypeMigrations, textShapeTypeValidator } from './shapes/TLTextShape'
import { videoShapeTypeMigrations, videoShapeTypeValidator } from './shapes/video'
import { storeMigrations } from './store-migrations'

/** @public */
export type SchemaShapeInfo = {
	migrations?: Migrations
	validator?: { validate: (record: any) => any }
}

const coreShapes: Record<string, SchemaShapeInfo> = {
	group: {
		migrations: groupShapeTypeMigrations,
		validator: groupShapeTypeValidator,
	},
	bookmark: {
		migrations: bookmarkShapeTypeMigrations,
		validator: bookmarkShapeTypeValidator,
	},
	embed: {
		migrations: embedShapeTypeMigrations,
		validator: embedShapeTypeValidator,
	},
	image: {
		migrations: imageShapeTypeMigrations,
		validator: imageShapeTypeValidator,
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

const defaultShapes: Record<string, SchemaShapeInfo> = {
	arrow: {
		migrations: arrowShapeTypeMigrations,
		validator: arrowShapeTypeValidator,
	},
	draw: {
		migrations: drawShapeTypeMigrations,
		validator: drawShapeTypeValidator,
	},
	frame: {
		migrations: frameShapeTypeMigrations,
		validator: frameShapeTypeValidator,
	},
	geo: {
		migrations: geoShapeTypeMigrations,
		validator: geoShapeTypeValidator,
	},
	line: {
		migrations: lineShapeTypeMigrations,
		validator: lineShapeTypeValidator,
	},
	note: {
		migrations: noteShapeTypeMigrations,
		validator: noteShapeTypeValidator,
	},
	highlight: {
		migrations: highlightShapeTypeMigrations,
		validator: highlightShapeTypeValidator,
	},
}

/**
 * Create a TLSchema with custom shapes. Custom shapes cannot override default shapes.
 *
 * @param opts - Options
 *
 * @public */
export function createTLSchema(
	opts = {} as {
		customShapes: Record<string, SchemaShapeInfo>
	}
) {
	const { customShapes } = opts

	for (const key in customShapes) {
		if (key in coreShapes) {
			throw Error(`Can't override default shape ${key}!`)
		}
	}

	const allShapeEntries = Object.entries({ ...coreShapes, ...defaultShapes, ...customShapes })

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
