import { StoreSchema, StoreValidator, createRecordType, defineMigrations } from '@tldraw/tlstore'
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
import { arrowShapeMigrations, arrowShapeTypeValidator } from './shapes/TLArrowShape'
import { bookmarkShapeMigrations, bookmarkShapeTypeValidator } from './shapes/TLBookmarkShape'
import { drawShapeMigrations, drawShapeTypeValidator } from './shapes/TLDrawShape'
import { embedShapeMigrations, embedShapeTypeValidator } from './shapes/TLEmbedShape'
import { frameShapeMigrations, frameShapeTypeValidator } from './shapes/TLFrameShape'
import { geoShapeMigrations, geoShapeTypeValidator } from './shapes/TLGeoShape'
import { groupShapeMigrations, groupShapeTypeValidator } from './shapes/TLGroupShape'
import { imageShapeMigrations, imageShapeTypeValidator } from './shapes/TLImageShape'
import { lineShapeMigrations, lineShapeTypeValidator } from './shapes/TLLineShape'
import { noteShapeMigrations, noteShapeTypeValidator } from './shapes/TLNoteShape'
import { textShapeMigrations, textShapeTypeValidator } from './shapes/TLTextShape'
import { videoShapeMigrations, videoShapeTypeValidator } from './shapes/TLVideoShape'

const CORE_SHAPE_DEFS: readonly CustomShapeTypeInfo[] = [
	{ type: 'draw', migrations: drawShapeMigrations, validator: drawShapeTypeValidator },
	{ type: 'text', migrations: textShapeMigrations, validator: textShapeTypeValidator },
	{ type: 'line', migrations: lineShapeMigrations, validator: lineShapeTypeValidator },
	{ type: 'arrow', migrations: arrowShapeMigrations, validator: arrowShapeTypeValidator },
	{ type: 'image', migrations: imageShapeMigrations, validator: imageShapeTypeValidator },
	{ type: 'video', migrations: videoShapeMigrations, validator: videoShapeTypeValidator },
	{ type: 'geo', migrations: geoShapeMigrations, validator: geoShapeTypeValidator },
	{ type: 'note', migrations: noteShapeMigrations, validator: noteShapeTypeValidator },
	{ type: 'group', migrations: groupShapeMigrations, validator: groupShapeTypeValidator },
	{
		type: 'bookmark',
		migrations: bookmarkShapeMigrations,
		validator: bookmarkShapeTypeValidator,
	},
	{ type: 'frame', migrations: frameShapeMigrations, validator: frameShapeTypeValidator },
	{ type: 'embed', migrations: embedShapeMigrations, validator: embedShapeTypeValidator },
]

/** @public */
export type CustomShapeTypeInfo = {
	type: string
	migrations: ReturnType<typeof defineMigrations>
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
		subTypeMigrations: Object.fromEntries(allShapeDefs.map((def) => [def.type, def.migrations])),
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
