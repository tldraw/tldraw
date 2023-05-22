import {
	Migrations,
	StoreSchema,
	StoreValidator,
	createRecordType,
	defineMigrations,
} from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { Signal } from 'signia'
import { TLRecord } from './TLRecord'
import { TLStore, TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { defaultDerivePresenceState } from './defaultDerivePresenceState'
import { TLAsset } from './records/TLAsset'
import { TLCamera } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance } from './records/TLInstance'
import { TLInstancePageState } from './records/TLInstancePageState'
import { TLInstancePresence } from './records/TLInstancePresence'
import { TLPage } from './records/TLPage'
import { TLShape, rootShapeTypeMigrations } from './records/TLShape'
import { TLUser } from './records/TLUser'
import { TLUserDocument } from './records/TLUserDocument'
import { TLUserPresence } from './records/TLUserPresence'
import { storeMigrations } from './schema'
import { arrowShapeTypeMigrations, arrowShapeTypeValidator } from './shapes/TLArrowShape'
import { bookmarkShapeTypeMigrations, bookmarkShapeTypeValidator } from './shapes/TLBookmarkShape'
import { drawShapeTypeMigrations, drawShapeTypeValidator } from './shapes/TLDrawShape'
import { embedShapeTypeMigrations, embedShapeTypeValidator } from './shapes/TLEmbedShape'
import { frameShapeTypeValidator } from './shapes/TLFrameShape'
import { geoShapeTypeMigrations, geoShapeTypeValidator } from './shapes/TLGeoShape'
import { groupShapeTypeMigrations, groupShapeTypeValidator } from './shapes/TLGroupShape'
import { imageShapeTypeMigrations, imageShapeTypeValidator } from './shapes/TLImageShape'
import { lineShapeTypeMigrations, lineShapeTypeValidator } from './shapes/TLLineShape'
import { noteShapeTypeMigrations, noteShapeTypeValidator } from './shapes/TLNoteShape'
import { textShapeTypeMigrations, textShapeTypeValidator } from './shapes/TLTextShape'
import { videoShapeTypeMigrations, videoShapeTypeValidator } from './shapes/TLVideoShape'

const CORE_SHAPE_DEFS: readonly CustomShapeTypeInfo[] = [
	{ type: 'draw', migrations: drawShapeTypeMigrations, validator: drawShapeTypeValidator },
	{ type: 'text', migrations: textShapeTypeMigrations, validator: textShapeTypeValidator },
	{ type: 'line', migrations: lineShapeTypeMigrations, validator: lineShapeTypeValidator },
	{ type: 'arrow', migrations: arrowShapeTypeMigrations, validator: arrowShapeTypeValidator },
	{ type: 'image', migrations: imageShapeTypeMigrations, validator: imageShapeTypeValidator },
	{ type: 'video', migrations: videoShapeTypeMigrations, validator: videoShapeTypeValidator },
	{ type: 'geo', migrations: geoShapeTypeMigrations, validator: geoShapeTypeValidator },
	{ type: 'note', migrations: noteShapeTypeMigrations, validator: noteShapeTypeValidator },
	{ type: 'group', migrations: groupShapeTypeMigrations, validator: groupShapeTypeValidator },
	{
		type: 'bookmark',
		migrations: bookmarkShapeTypeMigrations,
		validator: bookmarkShapeTypeValidator,
	},
	{ type: 'frame', validator: frameShapeTypeValidator },
	{ type: 'embed', migrations: embedShapeTypeMigrations, validator: embedShapeTypeValidator },
]

/** @public */
export type CustomShapeTypeInfo = {
	type: string
	migrations?: Migrations
	validator?: StoreValidator<TLShape>
}

/** @public */
export function createTLSchema({
	customShapeDefs,
	allowUnknownShapes,
	derivePresenceState,
}: {
	customShapeDefs?: readonly CustomShapeTypeInfo[]
	allowUnknownShapes?: boolean
	derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
}) {
	const allShapeDefs = [...CORE_SHAPE_DEFS, ...(customShapeDefs ?? [])]
	const typeSet = new Set<string>()
	for (const shapeDef of allShapeDefs) {
		if (typeSet.has(shapeDef.type)) {
			throw new Error(`Shape type ${shapeDef.type} is already defined`)
		}
		typeSet.add(shapeDef.type)
	}

	const shapeTypeMigrations = defineMigrations({
		currentVersion: rootShapeTypeMigrations.currentVersion,
		firstVersion: rootShapeTypeMigrations.firstVersion,
		migrators: rootShapeTypeMigrations.migrators,
		subTypeKey: 'type',
		subTypeMigrations: Object.fromEntries(
			allShapeDefs.map((def) => [def.type, def.migrations ?? {}])
		) as Record<string, Migrations>,
	})

	let shapeValidator = T.union('type', {
		...Object.fromEntries(allShapeDefs.map((def) => [def.type, def.validator ?? (T.any as any)])),
	}) as T.UnionValidator<'type', any, any>
	if (allowUnknownShapes) {
		shapeValidator = shapeValidator.validateUnknownVariants((shape) => shape as any)
	}

	const shapeRecord = createRecordType<TLShape>('shape', {
		migrations: shapeTypeMigrations,
		validator: T.model('shape', shapeValidator),
		scope: 'document',
	}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
			asset: TLAsset,
			camera: TLCamera,
			document: TLDocument,
			instance: TLInstance,
			instance_page_state: TLInstancePageState,
			page: TLPage,
			shape: shapeRecord,
			user: TLUser,
			user_document: TLUserDocument,
			user_presence: TLUserPresence,
			instance_presence: TLInstancePresence,
		},
		{
			snapshotMigrations: storeMigrations,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			derivePresenceState: derivePresenceState ?? defaultDerivePresenceState,
		}
	)
}
